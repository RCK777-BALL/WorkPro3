/*
 * SPDX-License-Identifier: MIT
 */

import Asset from '../../../models/Asset';
import DocumentModel, { type DocumentDoc } from '../../../models/Document';
import InventoryItem, { type IInventoryItem } from '../../../models/InventoryItem';
import PMTask, { type PMTaskDocument } from '../../../models/PMTask';
import WorkHistory, { type WorkHistoryDocument } from '../../../models/WorkHistory';
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
    .map((entry) => ({
      id: entry.id,
      date: entry.date,
      title: entry.title,
      status: entry.status,
      duration: entry.duration,
      notes: entry.notes,
    }));

const toDocumentSummary = (doc: Pick<DocumentDoc, '_id' | 'name' | 'title' | 'type' | 'url' | 'metadata'> & { createdAt?: Date }):
  AssetDocumentSummary => ({
    id: doc._id?.toString() ?? '',
    name: doc.name ?? doc.title,
    type: doc.type ?? doc.metadata?.type,
    url: doc.url,
    uploadedAt: doc.createdAt?.toISOString(),
    sizeBytes: doc.metadata?.size,
  });

const toBomPart = (part: IInventoryItem): AssetBomPart => ({
  id: part._id.toString(),
  name: part.name,
  quantity: part.quantity ?? 0,
  unitCost: part.unitCost ?? undefined,
  location: part.location ?? undefined,
  partNumber: part.partNumber ?? undefined,
});

const toPmTemplateSummary = (template: PMTaskDocument, assetId: string): AssetPmTemplateSummary[] => {
  const assignments = Array.from(template.assignments ?? []);
  return assignments
    .filter((assignment) => assignment.asset?.toString() === assetId)
    .map((assignment) => ({
      templateId: template._id?.toString() ?? '',
      assignmentId: assignment._id?.toString() ?? '',
      title: template.title,
      interval: assignment.interval,
      active: Boolean(template.active),
      nextDue: assignment.nextDue ? assignment.nextDue.toISOString() : undefined,
      usageMetric: assignment.usageMetric ?? undefined,
      usageTarget: assignment.usageTarget ?? undefined,
    }));
};

const toWorkOrderSummary = (order: WorkOrder): AssetWorkOrderSummary => ({
  id: order._id.toString(),
  title: order.title,
  status: order.status,
  priority: order.priority,
  type: order.type,
  updatedAt: order.updatedAt?.toISOString(),
  dueDate: order.dueDate?.toISOString(),
});

const createCostWindowStart = () => {
  const now = new Date();
  const window = new Date(now.getFullYear(), now.getMonth(), 1);
  window.setMonth(window.getMonth() - 11);
  return window;
};

const partsCostForOrder = (order: WorkOrder): number =>
  Array.from(order.partsUsed ?? []).reduce((sum, part) => sum + (part.cost ?? 0), 0);

const laborCostForOrder = (order: WorkOrder): number => ((order.timeSpentMin ?? 0) / 60) * HOURLY_RATE;

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

  const [history, documents, bomParts, pmTemplates, openWorkOrders, costOrders] = await Promise.all([
    WorkHistory.find({ tenantId: context.tenantId, asset: assetId }).limit(25).lean(),
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
  ]);

  const pmTemplateSummaries = pmTemplates.flatMap((template) => toPmTemplateSummary(template, assetId));

  return {
    asset: {
      id: asset._id.toString(),
      tenantId: asset.tenantId.toString(),
      name: asset.name,
      description: asset.description ?? asset.notes ?? undefined,
      status: asset.status,
      type: asset.type,
      criticality: asset.criticality,
      location: asset.location,
      serialNumber: asset.serialNumber,
      modelName: asset.modelName,
      manufacturer: asset.manufacturer,
      purchaseDate: asset.purchaseDate?.toISOString(),
      installationDate: asset.installationDate?.toISOString(),
      siteId: asset.siteId?.toString(),
      plantId: asset.plant?.toString(),
      departmentId: asset.departmentId?.toString(),
      lineId: asset.lineId?.toString(),
      stationId: asset.stationId?.toString(),
    },
    history: flattenHistory(history),
    documents: documents.map(toDocumentSummary),
    bom: bomParts.map(toBomPart),
    pmTemplates: pmTemplateSummaries,
    openWorkOrders: openWorkOrders.map(toWorkOrderSummary),
    costRollups: calculateCostRollups(costOrders),
  };
};
