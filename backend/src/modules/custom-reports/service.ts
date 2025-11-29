/*
 * SPDX-License-Identifier: MIT
 */

import PDFDocument from 'pdfkit';
import { Parser as Json2csvParser } from 'json2csv';
import type { PipelineStage, FilterQuery } from 'mongoose';
import { Types } from 'mongoose';

import WorkOrder from '../../../models/WorkOrder';
import ReportTemplate, { serializeTemplate } from '../../../models/ReportTemplate';
import { assertPermission } from '../../auth/permissions';
import type { AuthedRequest } from '../../../types/http';
import type {
  CustomReportResponse,
  ReportColumn,
  ReportFilter,
  ReportField,
  ReportQueryRequest,
  ReportTemplate as ReportTemplateDto,
  ReportTemplateInput,
} from '../../../shared/reports';

const DEFAULT_LIMIT = 250;
const MAX_LIMIT = 1_000;

const FIELD_CONFIG: Record<ReportField, { label: string; path: string }> = {
  title: { label: 'Title', path: 'title' },
  status: { label: 'Status', path: 'status' },
  priority: { label: 'Priority', path: 'priority' },
  type: { label: 'Type', path: 'type' },
  assetName: { label: 'Asset', path: 'assetName' },
  assigneeName: { label: 'Assignee', path: 'assigneeName' },
  createdAt: { label: 'Created', path: 'createdAt' },
  dueDate: { label: 'Due Date', path: 'dueDate' },
  completedAt: { label: 'Completed', path: 'completedAt' },
  totalCost: { label: 'Total Cost', path: 'totalCost' },
  downtimeMinutes: { label: 'Downtime (min)', path: 'downtimeMinutes' },
  laborHours: { label: 'Labor Hours', path: 'laborHours' },
  siteId: { label: 'Site', path: 'siteId' },
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

const buildMatchQuery = (
  tenantId: Types.ObjectId | string,
  filters: ReportFilter[] | undefined,
  dateRange: ReportQueryRequest['dateRange'],
): FilterQuery<unknown> => {
  const query: FilterQuery<unknown> = { tenantId: new Types.ObjectId(tenantId) };

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
    const config = FIELD_CONFIG[filter.field];
    if (!config) return;
    applyComparison(config.path, filter.operator, filter.value);
  });

  if (dateRange?.from || dateRange?.to) {
    query.createdAt = {
      ...(dateRange?.from ? { $gte: new Date(dateRange.from) } : {}),
      ...(dateRange?.to ? { $lte: new Date(dateRange.to) } : {}),
    };
  }

  return query;
};

const buildColumnMeta = (fields: ReportField[], includeAggregates: boolean): ReportColumn[] => {
  const columns: ReportColumn[] = fields.map((field) => ({
    key: field,
    label: FIELD_CONFIG[field]?.label ?? field,
  }));

  if (includeAggregates) {
    columns.push({ key: 'count', label: 'Count' });
    columns.push({ key: 'totalCost', label: 'Total Cost' });
    columns.push({ key: 'averageDowntime', label: 'Avg. Downtime (min)' });
    columns.push({ key: 'averageLaborHours', label: 'Avg. Labor Hours' });
  }

  return columns;
};

const formatRowValue = (value: unknown): string | number | null => {
  if (value === undefined || value === null) return null;
  if (value instanceof Date) return value.toISOString();
  if (Types.ObjectId.isValid(value)) return String(value);
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

const aggregateCustomReport = async (
  tenantId: Types.ObjectId | string,
  payload: ReportQueryRequest,
): Promise<CustomReportResponse> => {
  const { groupBy = [], filters = [], fields, dateRange, limit } = payload;
  const resolvedFields: ReportField[] = fields.length > 0 ? fields : ['title', 'status', 'priority'];
  const matchQuery = buildMatchQuery(tenantId, filters, dateRange);
  const basePipeline: PipelineStage[] = [
    { $match: matchQuery },
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
  ];

  if (groupBy.length > 0) {
    const groupedPipeline: PipelineStage[] = [
      ...basePipeline,
      {
        $group: {
          _id: Object.fromEntries(groupBy.map((field) => [field, `$${FIELD_CONFIG[field]?.path ?? field}`])),
          count: { $sum: 1 },
          totalCost: { $sum: { $ifNull: ['$totalCost', 0] } },
          averageDowntime: { $avg: { $ifNull: ['$downtimeMinutes', 0] } },
          averageLaborHours: { $avg: { $ifNull: ['$laborHours', 0] } },
        },
      },
      { $limit: sanitizeLimit(limit) },
    ];

    const results = await WorkOrder.aggregate(groupedPipeline).exec();
    const rows = results.map((row) => ({
      ...groupBy.reduce(
        (acc, field) => ({ ...acc, [field]: formatRowValue((row._id as Record<string, unknown>)[field]) }),
        {},
      ),
      count: row.count,
      totalCost: Math.round((row.totalCost ?? 0) * 100) / 100,
      averageDowntime: Math.round((row.averageDowntime ?? 0) * 100) / 100,
      averageLaborHours: Math.round((row.averageLaborHours ?? 0) * 100) / 100,
    }));
    const columns = buildColumnMeta(groupBy, true);
    return {
      columns,
      rows,
      total: results.length,
      groupBy,
      filters,
    };
  }

  const projection: Record<string, unknown> = { _id: 0 };
  resolvedFields.forEach((field) => {
    const path = FIELD_CONFIG[field]?.path ?? field;
    projection[field] = path === field ? 1 : { $ifNull: [`$${path}`, null] };
  });

  const fullPipeline: PipelineStage[] = [
    ...basePipeline,
    { $project: projection },
    { $sort: { createdAt: -1 } },
    { $limit: sanitizeLimit(limit) },
  ];

  const documents = await WorkOrder.aggregate(fullPipeline).exec();
  const columns = buildColumnMeta(resolvedFields, false);
  return {
    columns,
    rows: mapRows(documents, columns),
    total: documents.length,
    groupBy,
    filters,
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
  if (req.user?.tenantId) return req.user.tenantId;
  throw new Error('Tenant context is required for reports');
};

export const listReportTemplates = async (req: AuthedRequest): Promise<ReportTemplateDto[]> => {
  await assertPermission(req, 'reports', 'read');
  const tenantId = resolveTenantId(req);
  const docs = await ReportTemplate.find({ tenantId }).sort({ updatedAt: -1 }).exec();
  return docs.map((doc) => serializeTemplate(doc, String(tenantId)));
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
  const doc = await ReportTemplate.findOneAndUpdate(
    { _id: templateId, tenantId },
    payload,
    { new: true, runValidators: true },
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
  const doc = await ReportTemplate.findOne({ _id: templateId, tenantId }).exec();
  if (!doc) {
    throw Object.assign(new Error('Template not found'), { status: 404 });
  }
  return serializeTemplate(doc, String(tenantId));
};
