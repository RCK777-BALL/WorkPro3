/*
 * SPDX-License-Identifier: MIT
 */

import PDFDocument from 'pdfkit';
import { Parser as Json2csvParser } from 'json2csv';
import type { AccumulatorOperator, PipelineStage, Model as MongooseModel } from 'mongoose';
import { Types } from 'mongoose';

import WorkOrder from '../../../models/WorkOrder';
import Asset from '../../../models/Asset';
import InventoryItem from '../../../models/InventoryItem';
import SensorReading from '../../../models/SensorReading';
import ReportTemplate, { serializeTemplate, type ReportTemplateDoc } from '../../../models/ReportTemplate';
import { assertPermission } from '../../auth/permissions';
import type { AuthedRequest } from '../../../types/http';
import type {
  CustomReportResponse,
  ReportCalculation,
  ReportColumn,
  ReportFilter,
  ReportField,
  ReportModel,
  ReportQueryRequest,
  ReportTemplate as ReportTemplateDto,
  ReportTemplateInput,
} from '../../../shared/reports';

const DEFAULT_LIMIT = 250;
const MAX_LIMIT = 1_000;

type FieldConfig = { label: string; path: string; numeric?: boolean };

type ModelConfig = {
  model: MongooseModel<any>;
  tenantField?: string;
  dateField?: string;
  defaultFields: ReportField[];
  defaultCalculations?: ReportCalculation[];
  fields: Partial<Record<ReportField, FieldConfig>>;
  pipeline?: PipelineStage[];
};

const MODEL_CONFIGS: Record<ReportModel, ModelConfig> = {
  workOrders: {
    model: WorkOrder,
    tenantField: 'tenantId',
    dateField: 'createdAt',
    defaultFields: ['title', 'status', 'priority'],
    defaultCalculations: [
      { operation: 'count', as: 'count' },
      { operation: 'sum', field: 'totalCost', as: 'totalCost' },
      { operation: 'avg', field: 'downtimeMinutes', as: 'averageDowntime' },
      { operation: 'avg', field: 'laborHours', as: 'averageLaborHours' },
    ],
    fields: {
      title: { label: 'Title', path: 'title' },
      status: { label: 'Status', path: 'status' },
      priority: { label: 'Priority', path: 'priority' },
      type: { label: 'Type', path: 'type' },
      assetName: { label: 'Asset', path: 'assetName' },
      assigneeName: { label: 'Assignee', path: 'assigneeName' },
      createdAt: { label: 'Created', path: 'createdAt' },
      dueDate: { label: 'Due Date', path: 'dueDate' },
      completedAt: { label: 'Completed', path: 'completedAt' },
      totalCost: { label: 'Total Cost', path: 'totalCost', numeric: true },
      downtimeMinutes: { label: 'Downtime (min)', path: 'downtimeMinutes', numeric: true },
      laborHours: { label: 'Labor Hours', path: 'laborHours', numeric: true },
      laborCost: { label: 'Labor Cost', path: 'laborCost', numeric: true },
      siteId: { label: 'Site', path: 'siteId' },
    },
    pipeline: [
      {
        $lookup: {
          from: 'assets',
          localField: 'assetId',
          foreignField: '_id',
          as: 'asset',
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'assignedTo',
          foreignField: '_id',
          as: 'assignee',
        },
      },
      {
        $addFields: {
          assetName: { $first: '$asset.name' },
          assigneeName: { $first: '$assignee.name' },
        },
      },
    ],
  },
  assets: {
    model: Asset,
    tenantField: 'tenantId',
    dateField: 'createdAt',
    defaultFields: ['assetName', 'assetStatus', 'assetType'],
    defaultCalculations: [{ operation: 'count', as: 'count' }],
    fields: {
      assetName: { label: 'Asset', path: 'name' },
      assetStatus: { label: 'Status', path: 'status' },
      assetLocation: { label: 'Location', path: 'location' },
      assetCriticality: { label: 'Criticality', path: 'criticality' },
      assetType: { label: 'Type', path: 'type' },
      assetPurchaseCost: { label: 'Purchase Cost', path: 'purchaseCost', numeric: true },
      assetPurchaseDate: { label: 'Purchase Date', path: 'purchaseDate' },
      siteId: { label: 'Site', path: 'siteId' },
    },
  },
  labor: {
    model: WorkOrder,
    tenantField: 'tenantId',
    dateField: 'createdAt',
    defaultFields: ['assigneeName', 'status', 'laborHours'],
    defaultCalculations: [
      { operation: 'count', as: 'count' },
      { operation: 'sum', field: 'laborHours', as: 'totalLaborHours' },
      { operation: 'sum', field: 'laborCost', as: 'totalLaborCost' },
    ],
    fields: {
      assigneeName: { label: 'Assignee', path: 'assigneeName' },
      status: { label: 'Status', path: 'status' },
      laborHours: { label: 'Labor Hours', path: 'laborHours', numeric: true },
      laborCost: { label: 'Labor Cost', path: 'laborCost', numeric: true },
      createdAt: { label: 'Created', path: 'createdAt' },
      siteId: { label: 'Site', path: 'siteId' },
    },
    pipeline: [
      {
        $lookup: {
          from: 'users',
          localField: 'assignedTo',
          foreignField: '_id',
          as: 'assignee',
        },
      },
      {
        $addFields: {
          assigneeName: { $first: '$assignee.name' },
        },
      },
    ],
  },
  parts: {
    model: InventoryItem,
    tenantField: 'tenantId',
    dateField: 'createdAt',
    defaultFields: ['partName', 'partNumber', 'partCategory'],
    defaultCalculations: [
      { operation: 'count', as: 'count' },
      { operation: 'sum', field: 'partQuantity', as: 'totalQuantity' },
      { operation: 'sum', field: 'partUnitCost', as: 'totalUnitCost' },
    ],
    fields: {
      partName: { label: 'Part', path: 'name' },
      partNumber: { label: 'Part Number', path: 'partNumber' },
      partCategory: { label: 'Category', path: 'category' },
      partQuantity: { label: 'Quantity', path: 'quantity', numeric: true },
      partUnitCost: { label: 'Unit Cost', path: 'unitCost', numeric: true },
      siteId: { label: 'Site', path: 'siteId' },
    },
  },
  iotEvents: {
    model: SensorReading,
    tenantField: 'tenantId',
    dateField: 'timestamp',
    defaultFields: ['iotMetric', 'iotValue', 'iotTimestamp'],
    defaultCalculations: [
      { operation: 'count', as: 'count' },
      { operation: 'avg', field: 'iotValue', as: 'averageValue' },
    ],
    fields: {
      iotMetric: { label: 'Metric', path: 'metric' },
      iotValue: { label: 'Value', path: 'value', numeric: true },
      iotDeviceId: { label: 'Device', path: 'deviceId' },
      iotTimestamp: { label: 'Timestamp', path: 'timestamp' },
      iotAssetName: { label: 'Asset', path: 'assetName' },
      siteId: { label: 'Site', path: 'assetSiteId' },
    },
    pipeline: [
      {
        $lookup: {
          from: 'assets',
          localField: 'asset',
          foreignField: '_id',
          as: 'assetDoc',
        },
      },
      {
        $addFields: {
          assetName: { $first: '$assetDoc.name' },
          assetSiteId: { $first: '$assetDoc.siteId' },
        },
      },
    ],
  },
};

const sanitizeLimit = (value?: number) => {
  if (!value || Number.isNaN(value)) return DEFAULT_LIMIT;
  return Math.min(Math.max(1, value), MAX_LIMIT);
};

const normalizeFilterValue = (value: ReportFilter['value']): ReportFilter['value'] => {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null) return '';
  return value;
};

const resolveModelConfig = (model?: ReportModel): ModelConfig => MODEL_CONFIGS[model ?? 'workOrders'];

const buildMatchQuery = (
  tenantId: Types.ObjectId | string,
  filters: ReportFilter[] | undefined,
  dateRange: ReportQueryRequest['dateRange'],
  config: ModelConfig,
): Record<string, unknown> => {
  const tenantField = config.tenantField ?? 'tenantId';
  const query: Record<string, unknown> = { [tenantField]: new Types.ObjectId(tenantId) };

  const applyComparison = (field: string, operator: ReportFilter['operator'], rawValue: ReportFilter['value']) => {
    const value = normalizeFilterValue(rawValue);
    switch (operator) {
      case 'eq':
        query[field] = value;
        break;
      case 'ne':
        query[field] = { $ne: value };
        break;
      case 'in':
        query[field] = { $in: Array.isArray(value) ? value : String(value).split(',').map((v) => v.trim()) };
        break;
      case 'contains':
        query[field] = { $regex: value, $options: 'i' };
        break;
      case 'gte':
        query[field] = { ...(query[field] as Record<string, unknown>), $gte: value };
        break;
      case 'lte':
        query[field] = { ...(query[field] as Record<string, unknown>), $lte: value };
        break;
      default:
        break;
    }
  };

  filters?.forEach((filter) => {
    const fieldConfig = config.fields[filter.field];
    if (!fieldConfig) return;
    applyComparison(fieldConfig.path, filter.operator, filter.value);
  });

  const dateField = config.dateField ?? 'createdAt';
  if (dateRange?.from || dateRange?.to) {
    query[dateField] = {
      ...(dateRange?.from ? { $gte: new Date(dateRange.from) } : {}),
      ...(dateRange?.to ? { $lte: new Date(dateRange.to) } : {}),
    };
  }

  return query;
};

const buildColumnMeta = (
  fields: ReportField[],
  calculations: ReportCalculation[],
  config: ModelConfig,
): ReportColumn[] => {
  const columns: ReportColumn[] = fields.map((field) => ({
    key: field,
    label: config.fields[field]?.label ?? field,
  }));

  calculations.forEach((calc) => {
    const key = calc.as ?? (calc.field ? `${calc.operation}_${calc.field}` : calc.operation);
    const label = calc.field
      ? `${calc.operation.toUpperCase()} ${config.fields[calc.field]?.label ?? calc.field}`
      : calc.operation.toUpperCase();
    columns.push({ key, label });
  });

  return columns;
};

const isObjectIdValue = (
  value: unknown,
): value is string | number | Types.ObjectId | Buffer => {
  if (typeof value === 'string' || typeof value === 'number') return true;
  if (typeof value === 'object' && value !== null && value instanceof Types.ObjectId) return true;
  return typeof value === 'object' && value !== null && Buffer.isBuffer(value);
};

const formatRowValue = (value: unknown): string | number | null => {
  if (value === undefined || value === null) return null;
  if (value instanceof Date) return value.toISOString();
  if (
    isObjectIdValue(value) &&
    (typeof value === 'string' || value instanceof Types.ObjectId || Buffer.isBuffer(value)) &&
    Types.ObjectId.isValid(value)
  ) {
    return String(value);
  }
  return typeof value === 'string' || typeof value === 'number' ? value : JSON.stringify(value);
};

const mapRows = (documents: Array<Record<string, unknown>>, columns: ReportColumn[]) =>
  documents.map((doc) => {
    const row: Record<string, string | number | null> = {};
    columns.forEach((col) => {
      row[col.key] = formatRowValue(col.key in doc ? doc[col.key] : undefined);
    });
    return row;
  });

const resolveFields = (fields: ReportField[], config: ModelConfig): ReportField[] => {
  const allowed = fields.filter((field) => config.fields[field]);
  return allowed.length > 0 ? allowed : config.defaultFields;
};

const resolveCalculations = (calculations: ReportCalculation[] | undefined, config: ModelConfig): ReportCalculation[] => {
  const requested = calculations ?? [];
  return requested.map((calc, index) => {
    if ((calc.operation === 'sum' || calc.operation === 'avg') && (!calc.field || !config.fields[calc.field]?.numeric)) {
      throw new Error('Numeric field required for aggregation');
    }
    return {
      ...calc,
      as: calc.as ?? (calc.field ? `${calc.operation}_${calc.field}` : `${calc.operation}_${index}`),
    };
  });
};

const buildGroupedRows = (
  results: Array<Record<string, any>>,
  groupBy: ReportField[],
  calculations: ReportCalculation[],
): Array<Record<string, string | number | null>> => {
  return results.map((row) => {
    const base: Record<string, string | number | null> = groupBy.length
      ? groupBy.reduce<Record<string, string | number | null>>((acc, field) => {
          acc[field] = formatRowValue((row._id as Record<string, unknown>)[field]);
          return acc;
        }, {})
      : {};

    calculations.forEach((calc) => {
      const key = calc.as ?? calc.operation;
      const value = row[key];
      base[key] = typeof value === 'number' ? Math.round(value * 100) / 100 : formatRowValue(value);
    });
    return base;
  });
};

const aggregateCustomReport = async (
  tenantId: Types.ObjectId | string,
  payload: ReportQueryRequest,
): Promise<CustomReportResponse> => {
  const { groupBy = [], filters = [], fields = [], dateRange, limit, model } = payload;
  const modelConfig = resolveModelConfig(model);
  const resolvedFields = resolveFields(fields, modelConfig);
  const resolvedCalculations = payload.calculations?.length
    ? resolveCalculations(payload.calculations, modelConfig)
    : groupBy.length > 0
      ? resolveCalculations(modelConfig.defaultCalculations, modelConfig)
      : [];
  const matchQuery = buildMatchQuery(tenantId, filters, dateRange, modelConfig);
  const basePipeline: PipelineStage[] = [{ $match: matchQuery }, ...(modelConfig.pipeline ?? [])];

  if (groupBy.length > 0 || resolvedCalculations.length > 0) {
    const groupingFields = groupBy.filter((field) => modelConfig.fields[field]);
    type GroupAccumulator = {
      _id: PipelineStage.Group['$group']['_id'];
      [key: string]: PipelineStage.Group['$group']['_id'] | AccumulatorOperator;
    };
    const groupStage: GroupAccumulator = {
      _id: groupingFields.length
        ? Object.fromEntries(groupingFields.map((field) => [field, `$${modelConfig.fields[field]?.path ?? field}`]))
        : null,
    };

    resolvedCalculations.forEach((calc) => {
      const key = calc.as ?? calc.operation;
      if (calc.operation === 'count') {
        groupStage[key] = { $sum: 1 };
      }
      if ((calc.operation === 'sum' || calc.operation === 'avg') && calc.field) {
        const path = modelConfig.fields[calc.field]?.path ?? calc.field;
        const op = calc.operation === 'sum' ? '$sum' : '$avg';
        groupStage[key] = { [op]: { $ifNull: [`$${path}`, 0] } };
      }
    });

    const groupedPipeline: PipelineStage[] = [...basePipeline, { $group: groupStage }, { $limit: sanitizeLimit(limit) }];
    const results = await modelConfig.model.aggregate(groupedPipeline).exec();
    const columns = buildColumnMeta(groupingFields, resolvedCalculations, modelConfig);
    return {
      columns,
      rows: buildGroupedRows(results, groupingFields, resolvedCalculations),
      total: results.length,
      groupBy: groupingFields,
      filters,
      calculations: resolvedCalculations,
    };
  }

  const projection: Record<string, unknown> = { _id: 0 };
  resolvedFields.forEach((field) => {
    const path = modelConfig.fields[field]?.path ?? field;
    projection[field] = path === field ? 1 : { $ifNull: [`$${path}`, null] };
  });

  const sortField = modelConfig.dateField ?? 'createdAt';
  const fullPipeline: PipelineStage[] = [
    ...basePipeline,
    { $project: projection },
    { $sort: { [sortField]: -1 } },
    { $limit: sanitizeLimit(limit) },
  ];

  const documents = await modelConfig.model.aggregate(fullPipeline).exec();
  const columns = buildColumnMeta(resolvedFields, [], modelConfig);
  return {
    columns,
    rows: mapRows(documents, columns),
    total: documents.length,
    groupBy: [],
    filters,
    calculations: [],
  };
};

export const runCustomReport = async (
  tenantId: Types.ObjectId | string,
  payload: ReportQueryRequest,
): Promise<CustomReportResponse> => aggregateCustomReport(tenantId, payload);

export const exportCustomReport = async (
  tenantId: Types.ObjectId | string,
  payload: ReportQueryRequest & { format?: 'csv' | 'pdf' },
): Promise<{ buffer: Buffer; filename: string; contentType: string }> => {
  const result = await aggregateCustomReport(tenantId, payload);
  const format = payload.format ?? 'csv';

  if (format === 'pdf') {
    const doc = new PDFDocument({ margin: 32 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));

    doc.fontSize(18).text('Custom Report', { align: 'left' });
    doc.moveDown();
    doc.fontSize(12).text(`Generated: ${new Date().toISOString()}`);
    doc.moveDown();

    if (payload.groupBy?.length) {
      doc.fontSize(12).text(`Grouped by: ${payload.groupBy.join(', ')}`);
      doc.moveDown();
    }

    const headers = result.columns.map((column) => column.label).join(' | ');
    doc.font('Helvetica-Bold').text(headers);
    doc.moveDown(0.5);
    doc.font('Helvetica');

    result.rows.forEach((row) => {
      const line = result.columns
        .map((column) => {
          const value = row[column.key];
          return value === null || value === undefined ? '-' : String(value);
        })
        .join(' | ');
      doc.text(line);
    });

    doc.end();
    const buffer = await new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });

    return {
      buffer,
      filename: 'custom-report.pdf',
      contentType: 'application/pdf',
    };
  }

  const parser = new Json2csvParser({ fields: result.columns.map((column) => ({ value: column.key, label: column.label })) });
  const csv = parser.parse(result.rows);
  return {
    buffer: Buffer.from(csv),
    filename: 'custom-report.csv',
    contentType: 'text/csv',
  };
};

const resolveTenantId = (req: AuthedRequest): Types.ObjectId | string => {
  if (req.tenantId) return req.tenantId;
  const userTenantId = req.user?.tenantId as unknown;
  if (typeof userTenantId === 'string') {
    return userTenantId;
  }
  if (typeof userTenantId === 'object' && userTenantId !== null && userTenantId instanceof Types.ObjectId) {
    return userTenantId;
  }
  throw Object.assign(new Error('Tenant context is required'), { status: 400 });
};

const templateVisibleToUser = (doc: ReportTemplateDoc, req: AuthedRequest): boolean => {
  const userId = req.user?.id ?? req.user?._id;
  if (userId && doc.ownerId.toString() === String(userId)) return true;
  const scope = doc.visibility?.scope ?? 'private';
  if (scope === 'tenant') return true;
  if (scope === 'roles') {
    const roles = (req.user as { roles?: string[] })?.roles ?? [];
    return (doc.visibility?.roles ?? []).some((role) => roles.includes(role));
  }
  return false;
};

export const listReportTemplates = async (req: AuthedRequest): Promise<ReportTemplateDto[]> => {
  await assertPermission(req, 'reports', 'read');
  const tenantId = resolveTenantId(req);
  const docs = await ReportTemplate.find({ tenantId }).sort({ updatedAt: -1 }).exec();
  return docs.filter((doc) => templateVisibleToUser(doc, req)).map((doc) => serializeTemplate(doc, String(tenantId)));
};

export const saveReportTemplate = async (
  req: AuthedRequest,
  payload: ReportTemplateInput,
): Promise<ReportTemplateDto> => {
  await assertPermission(req, 'reports', 'build');
  const tenantId = resolveTenantId(req);
  const ownerId = req.user?.id ?? req.user?._id;
  if (!ownerId) {
    throw Object.assign(new Error('Unauthorized'), { status: 401 });
  }

  const template = new ReportTemplate({
    ...payload,
    tenantId,
    ownerId,
  });
  const doc = await template.save();
  return serializeTemplate(doc, String(tenantId));
};

export const updateReportTemplate = async (
  req: AuthedRequest,
  templateId: string,
  payload: ReportTemplateInput,
): Promise<ReportTemplateDto> => {
  await assertPermission(req, 'reports', 'build');
  const tenantId = resolveTenantId(req);
  const updatePayload: Record<string, unknown> = { ...payload };
  if (!payload.shareId) {
    delete updatePayload.shareId;
  }

  const doc = await ReportTemplate.findOneAndUpdate(
    { _id: templateId, tenantId },
    updatePayload,
    { returnDocument: 'after', runValidators: true },
  ).exec();

  if (!doc) {
    throw Object.assign(new Error('Template not found'), { status: 404 });
  }

  return serializeTemplate(doc, String(tenantId));
};

export const getReportTemplate = async (
  req: AuthedRequest,
  templateId: string,
): Promise<ReportTemplateDto> => {
  await assertPermission(req, 'reports', 'read');
  const tenantId = resolveTenantId(req);
  const query: Record<string, unknown> = { tenantId, $or: [{ shareId: templateId }] };
  if (Types.ObjectId.isValid(templateId)) {
    (query.$or as Array<Record<string, unknown>>).unshift({ _id: templateId });
  }
  const doc = await ReportTemplate.findOne(query).exec();
  if (!doc) {
    throw Object.assign(new Error('Template not found'), { status: 404 });
  }
  if (!templateVisibleToUser(doc, req)) {
    throw Object.assign(new Error('Forbidden'), { status: 403 });
  }
  return serializeTemplate(doc, String(tenantId));
};
