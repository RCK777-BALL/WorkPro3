/*
 * SPDX-License-Identifier: MIT
 */

import Asset from '../../../models/Asset';
import DocumentModel, { type DocumentDoc } from '../../../models/Document';
import InventoryItem, { type IInventoryItem } from '../../../models/InventoryItem';
import PMTask, { type PMTaskDocument } from '../../../models/PMTask';
import WorkHistory, { type WorkHistoryDocument } from '../../../models/WorkHistory';
import DowntimeLog, { type DowntimeLogDocument } from '../../../models/DowntimeLog';
import WorkOrderModel, { type WorkOrder } from '../../../models/WorkOrder';

export class AssetInsightsError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'AssetInsightsError';
    this.status = status;
  }
}

export type AssetInsightsContext = {
  tenantId: string;
  siteId?: string;
  plantId?: string;
};

export type AssetHistoryEntry = {
  id: string;
  date: string;
  title: string;
  status: string;
  duration?: number;
  notes?: string;
};

export type AssetDocumentSummary = {
  id: string;
  name?: string;
  type?: string;
  url: string;
  uploadedAt?: string;
  sizeBytes?: number;
};

export type AssetBomPart = {
  id: string;
  name: string;
  quantity: number;
  unitCost?: number;
  location?: string;
  partNumber?: string;
};

export type AssetPmTemplateSummary = {
  templateId: string;
  assignmentId: string;
  title: string;
  interval: string;
  active: boolean;
  nextDue?: string;
  usageMetric?: string;
  usageTarget?: number;
};

export type AssetWorkOrderSummary = {
  id: string;
  title: string;
  status: WorkOrder['status'];
  priority: WorkOrder['priority'];
  type: WorkOrder['type'];
  updatedAt?: string;
  dueDate?: string;
};

export type AssetDowntimeLog = {
  id: string;
  start: string;
  end?: string;
  reason?: string;
  durationMinutes: number;
};

export type AssetReliabilitySummary = {
  mttrHours: number;
  mtbfHours: number;
};

export type AssetCostRollup = {
  total: number;
  maintenance: number;
  labor: number;
  parts: number;
  currency: string;
  timeframe: string;
  monthly: Array<{
    month: string;
    labor: number;
    parts: number;
    total: number;
  }>;
};

export type AssetInsightsResponse = {
  asset: {
    id: string;
    tenantId: string;
    name: string;
    description?: string;
    status?: string;
    type?: string;
    criticality?: string;
    location?: string;
    serialNumber?: string;
    modelName?: string;
    manufacturer?: string;
    purchaseDate?: string;
    installationDate?: string;
    siteId?: string;
    plantId?: string;
    departmentId?: string;
    lineId?: string;
    stationId?: string;
  };
  history: AssetHistoryEntry[];
  documents: AssetDocumentSummary[];
  bom: AssetBomPart[];
  pmTemplates: AssetPmTemplateSummary[];
  openWorkOrders: AssetWorkOrderSummary[];
  costRollups: AssetCostRollup;
  downtimeLogs: AssetDowntimeLog[];
  reliability: AssetReliabilitySummary;
};

const OPEN_WORK_ORDER_STATUSES: ReadonlySet<WorkOrder['status']> = new Set([
  'requested',
  'assigned',
  'in_progress',
  'paused',
]);

const HOURLY_RATE = 75;

const flattenHistory = (history: WorkHistoryDocument[]): AssetHistoryEntry[] =>
  history
    .flatMap((entry) => entry.recentWork ?? [])
    .map((entry) => {
      const result: AssetHistoryEntry = {
        id: entry.id,
        date: entry.date,
        title: entry.title,
        status: entry.status,
      };

      if (typeof entry.duration === 'number') {
        result.duration = entry.duration;
      }

      if (entry.notes !== undefined) {
        result.notes = entry.notes;
      }

      return result;
    });

const toDocumentSummary = (doc: Pick<DocumentDoc, '_id' | 'name' | 'title' | 'type' | 'url' | 'metadata'> & { createdAt?: Date }):
  AssetDocumentSummary => {
    const summary: AssetDocumentSummary = {
      id: doc._id?.toString() ?? '',
      url: doc.url,
    };

    const name = doc.name ?? doc.title;
    if (name !== undefined) {
      summary.name = name;
    }

    const type = doc.type ?? doc.metadata?.type;
    if (type !== undefined) {
      summary.type = type;
    }

    if (doc.createdAt) {
      summary.uploadedAt = doc.createdAt.toISOString();
    }

    if (doc.metadata?.size !== undefined) {
      summary.sizeBytes = doc.metadata.size;
    }

    return summary;
  };

const toBomPart = (part: IInventoryItem): AssetBomPart => ({
  id: part._id.toString(),
  name: part.name,
  quantity: part.quantity ?? 0,
  ...(part.unitCost !== undefined ? { unitCost: part.unitCost } : {}),
  ...(part.location !== undefined ? { location: part.location } : {}),
  ...(part.partNumber !== undefined ? { partNumber: part.partNumber } : {}),
});

const toPmTemplateSummary = (template: PMTaskDocument, assetId: string): AssetPmTemplateSummary[] => {
  const assignments = Array.from(template.assignments ?? []);
  return assignments
    .filter((assignment) => assignment.asset?.toString() === assetId)
    .map((assignment) => {
      const summary: AssetPmTemplateSummary = {
        templateId: template._id?.toString() ?? '',
        assignmentId: assignment._id?.toString() ?? '',
        title: template.title,
        interval: assignment.interval,
        active: Boolean(template.active),
      };

      if (assignment.nextDue) {
        summary.nextDue = assignment.nextDue.toISOString();
      }

      if (assignment.usageMetric !== undefined) {
        summary.usageMetric = assignment.usageMetric;
      }

      if (assignment.usageTarget !== undefined) {
        summary.usageTarget = assignment.usageTarget;
      }

      return summary;
    });
};

const toWorkOrderSummary = (order: WorkOrder): AssetWorkOrderSummary => {
  const summary: AssetWorkOrderSummary = {
    id: order._id.toString(),
    title: order.title,
    status: order.status,
    priority: order.priority,
    type: order.type,
  };

  if (order.updatedAt) {
    summary.updatedAt = order.updatedAt.toISOString();
  }

  if (order.dueDate) {
    summary.dueDate = order.dueDate.toISOString();
  }

  return summary;
};

const createCostWindowStart = () => {
  const now = new Date();
  const window = new Date(now.getFullYear(), now.getMonth(), 1);
  window.setMonth(window.getMonth() - 11);
  return window;
};

const partsCostForOrder = (order: WorkOrder): number =>
  Array.from(order.partsUsed ?? []).reduce((sum, part) => sum + (part.cost ?? 0), 0);

const laborCostForOrder = (order: WorkOrder): number => ((order.timeSpentMin ?? 0) / 60) * HOURLY_RATE;

const calculateMttrFromOrders = (orders: WorkOrder[]): number => {
  const completed = orders.filter((order) => order.completedAt);
  if (!completed.length) return 0;
  const totalHours = completed.reduce((sum, order) => {
    const end = order.completedAt?.getTime() ?? 0;
    const start = order.createdAt?.getTime() ?? end;
    const durationHours =
      typeof order.timeSpentMin === 'number' && order.timeSpentMin > 0
        ? order.timeSpentMin / 60
        : Math.max(end - start, 0) / 36e5;
    return sum + durationHours;
  }, 0);

  return totalHours / completed.length;
};

const calculateMtbfFromOrders = (orders: WorkOrder[]): number => {
  const failures = [...orders]
    .filter((order) => order.completedAt)
    .sort((a, b) => (a.completedAt?.getTime() ?? 0) - (b.completedAt?.getTime() ?? 0));
  if (failures.length < 2) return 0;
  let total = 0;
  for (let idx = 1; idx < failures.length; idx += 1) {
    total += (failures[idx].completedAt?.getTime() ?? 0) - (failures[idx - 1].completedAt?.getTime() ?? 0);
  }
  return total / (failures.length - 1) / 36e5;
};

const calculateReliabilityFromHistory = (
  history: WorkHistoryDocument[],
): AssetReliabilitySummary => {
  const completed = history.filter((entry) => entry.completedAt);
  if (!completed.length) {
    return { mtbfHours: 0, mttrHours: 0 };
  }

  const mttrHours = (() => {
    const durations = completed
      .map((entry) => entry.timeSpentHours)
      .filter((value): value is number => typeof value === 'number' && value >= 0);
    if (!durations.length) return 0;
    const total = durations.reduce((sum, value) => sum + value, 0);
    return total / durations.length;
  })();

  const mtbfHours = (() => {
    const failures = [...completed].sort(
      (a, b) => (a.completedAt?.getTime() ?? 0) - (b.completedAt?.getTime() ?? 0),
    );
    if (failures.length < 2) return 0;
    let delta = 0;
    for (let idx = 1; idx < failures.length; idx += 1) {
      delta += (failures[idx].completedAt?.getTime() ?? 0) - (failures[idx - 1].completedAt?.getTime() ?? 0);
    }
    return delta / (failures.length - 1) / 36e5;
  })();

  return { mtbfHours, mttrHours };
};

const buildReliabilitySummary = (
  history: WorkHistoryDocument[],
  orders: WorkOrder[],
): AssetReliabilitySummary => {
  const historyMetrics = calculateReliabilityFromHistory(history);
  const mttrHours = historyMetrics.mttrHours || calculateMttrFromOrders(orders);
  const mtbfHours = historyMetrics.mtbfHours || calculateMtbfFromOrders(orders);
  return { mttrHours, mtbfHours };
};

const toDowntimeLog = (log: DowntimeLogDocument): AssetDowntimeLog => {
  const start = log.start ? new Date(log.start) : new Date();
  const end = log.end ? new Date(log.end) : new Date();
  const durationMinutes = Math.max(end.getTime() - start.getTime(), 0) / 60000;

  const summary: AssetDowntimeLog = {
    id: log._id?.toString() ?? '',
    start: start.toISOString(),
    durationMinutes,
  };

  if (log.end) {
    summary.end = log.end.toISOString();
  }

  if (log.reason) {
    summary.reason = log.reason;
  }

  return summary;
};

const buildMonthlyRollups = (orders: WorkOrder[]): AssetCostRollup['monthly'] => {
  const months: { key: string; label: string }[] = [];
  const now = new Date();
  for (let offset = 11; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
    const label = date.toLocaleDateString(undefined, { month: 'short' });
    months.push({ key, label });
  }
  const buckets = new Map(months.map(({ key, label }) => [key, { month: label, labor: 0, parts: 0, total: 0 }]));

  orders.forEach((order) => {
    const sourceDate = order.updatedAt ?? order.completedAt ?? order.createdAt;
    if (!sourceDate) {
      return;
    }
    const key = `${sourceDate.getFullYear()}-${sourceDate.getMonth() + 1}`;
    const bucket = buckets.get(key);
    if (!bucket) {
      return;
    }
    const parts = partsCostForOrder(order);
    const labor = laborCostForOrder(order);
    bucket.parts += parts;
    bucket.labor += labor;
    bucket.total += parts + labor;
  });

  return Array.from(buckets.values());
};

const calculateCostRollups = (orders: WorkOrder[]): AssetCostRollup => {
  const parts = orders.reduce((sum, order) => sum + partsCostForOrder(order), 0);
  const labor = orders.reduce((sum, order) => sum + laborCostForOrder(order), 0);
  const monthly = buildMonthlyRollups(orders);
  return {
    total: parts + labor,
    maintenance: parts + labor,
    labor,
    parts,
    currency: 'USD',
    timeframe: 'Trailing 12 months',
    monthly,
  };
};

export const getAssetInsights = async (
  context: AssetInsightsContext,
  assetId: string,
): Promise<AssetInsightsResponse> => {
  const asset = await Asset.findOne({ _id: assetId, tenantId: context.tenantId }).lean();
  if (!asset) {
    throw new AssetInsightsError('Asset not found', 404);
  }

  const costWindowStart = createCostWindowStart();

  const [
    historyRaw,
    documentsRaw,
    bomPartsRaw,
    pmTemplatesRaw,
    openWorkOrdersRaw,
    costOrdersRaw,
    downtimeLogsRaw,
    reliabilityOrdersRaw,
  ] = await Promise.all([
    WorkHistory.find({ tenantId: context.tenantId, asset: assetId })
      .sort({ completedAt: -1 })
      .limit(250)
      .lean(),
    DocumentModel.find({ asset: assetId }).sort({ createdAt: -1 }).limit(50).lean(),
    InventoryItem.find({ tenantId: context.tenantId, asset: assetId }).lean(),
    PMTask.find({ tenantId: context.tenantId, 'assignments.asset': assetId })
      .select('title assignments active')
      .lean(),
    WorkOrderModel.find({
      tenantId: context.tenantId,
      assetId,
      status: { $in: Array.from(OPEN_WORK_ORDER_STATUSES) },
    })
      .sort({ updatedAt: -1 })
      .limit(25)
      .lean(),
    WorkOrderModel.find({ tenantId: context.tenantId, assetId, updatedAt: { $gte: costWindowStart } })
      .select('partsUsed timeSpentMin updatedAt completedAt createdAt')
      .lean(),
    DowntimeLog.find({ tenantId: context.tenantId, assetId }).sort({ start: -1 }).limit(200).lean(),
    WorkOrderModel.find({ tenantId: context.tenantId, assetId })
      .select('createdAt completedAt status timeSpentMin')
      .sort({ completedAt: -1 })
      .limit(500)
      .lean(),
  ]);

  const pmTemplates = pmTemplatesRaw as unknown as PMTaskDocument[];
  const pmTemplateSummaries = pmTemplates.flatMap((template) => toPmTemplateSummary(template, assetId));

  const assetSummary: AssetInsightsResponse['asset'] = {
    id: asset._id.toString(),
    tenantId: asset.tenantId.toString(),
    name: asset.name,
  };

  const description = asset.description ?? asset.notes;
  if (description) {
    assetSummary.description = description;
  }

  if (asset.status) {
    assetSummary.status = asset.status;
  }

  if (asset.type) {
    assetSummary.type = asset.type;
  }

  if (asset.criticality) {
    assetSummary.criticality = asset.criticality;
  }

  if (asset.location) {
    assetSummary.location = asset.location;
  }

  if (asset.serialNumber) {
    assetSummary.serialNumber = asset.serialNumber;
  }

  if (asset.modelName) {
    assetSummary.modelName = asset.modelName;
  }

  if (asset.manufacturer) {
    assetSummary.manufacturer = asset.manufacturer;
  }

  if (asset.purchaseDate) {
    assetSummary.purchaseDate = asset.purchaseDate.toISOString();
  }

  if (asset.installationDate) {
    assetSummary.installationDate = asset.installationDate.toISOString();
  }

  if (asset.siteId) {
    assetSummary.siteId = asset.siteId.toString();
  }

  if (asset.plant) {
    assetSummary.plantId = asset.plant.toString();
  }

  if (asset.departmentId) {
    assetSummary.departmentId = asset.departmentId.toString();
  }

  if (asset.lineId) {
    assetSummary.lineId = asset.lineId.toString();
  }

  if (asset.stationId) {
    assetSummary.stationId = asset.stationId.toString();
  }

  return {
    asset: assetSummary,
    history: flattenHistory(historyRaw as unknown as WorkHistoryDocument[]),
    documents: (documentsRaw as Array<Pick<DocumentDoc, '_id' | 'name' | 'title' | 'type' | 'url' | 'metadata'> & { createdAt?: Date }>).map(
      toDocumentSummary,
    ),
    bom: (bomPartsRaw as unknown as IInventoryItem[]).map(toBomPart),
    pmTemplates: pmTemplateSummaries,
    openWorkOrders: (openWorkOrdersRaw as WorkOrder[]).map(toWorkOrderSummary),
    costRollups: calculateCostRollups(costOrdersRaw as WorkOrder[]),
    downtimeLogs: (downtimeLogsRaw as DowntimeLogDocument[]).map(toDowntimeLog),
    reliability: buildReliabilitySummary(
      historyRaw as WorkHistoryDocument[],
      reliabilityOrdersRaw as WorkOrder[],
    ),
  };
};
