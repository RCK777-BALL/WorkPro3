/*
 * SPDX-License-Identifier: MIT
 */

import { Types } from 'mongoose';
import Asset from '../../../models/Asset';
import Line from '../../../models/Line';
import Site from '../../../models/Site';
import PMTask from '../../../models/PMTask';
import WorkOrder from '../../../models/WorkOrder';
import MetricsRollup, {
  type MetricsGranularity,
  type MetricsRollup as MetricsRollupDocument,
} from '../../../models/MetricsRollup';

export interface MetricsRollupFilters {
  startDate?: Date;
  endDate?: Date;
  siteIds?: string[];
  lineIds?: string[];
  assetIds?: string[];
  granularity?: MetricsGranularity;
}

export interface MetricsRollupBreakdownRow {
  scope: 'tenant' | 'site' | 'line' | 'asset';
  id?: string;
  name?: string;
  workOrders: number;
  completedWorkOrders: number;
  mttrHours: number;
  mtbfHours: number;
  pmCompleted: number;
  pmTotal: number;
  pmCompliance: number;
  downtimeMinutes: number;
}

export interface MetricsRollupSummary {
  range: { start?: string; end?: string; granularity: MetricsGranularity };
  totals: MetricsRollupBreakdownRow;
  breakdown: MetricsRollupBreakdownRow[];
  availableFilters: {
    sites: Array<{ id: string; name?: string }>;
    lines: Array<{ id: string; name?: string; siteId?: string }>;
    assets: Array<{ id: string; name?: string; siteId?: string; lineId?: string }>;
  };
}

export interface MetricsRollupDetail {
  id: string;
  title: string;
  status: string;
  type: string;
  priority?: string;
  createdAt?: string;
  completedAt?: string;
  downtimeMinutes?: number;
  timeSpentMinutes?: number;
  assetId?: string;
  assetName?: string;
  siteId?: string;
  siteName?: string;
  lineId?: string;
  lineName?: string;
  pmTaskId?: string;
  pmTaskTitle?: string;
}

export interface MetricsRollupDetailsResponse {
  workOrders: MetricsRollupDetail[];
}

type BucketKey = {
  tenantId: Types.ObjectId;
  period: Date;
  granularity: MetricsGranularity;
  siteId?: Types.ObjectId;
  lineId?: Types.ObjectId;
  assetId?: Types.ObjectId;
};

interface BucketMetrics {
  workOrders: number;
  completedWorkOrders: number;
  downtimeMinutes: number;
  pmTotal: number;
  pmCompleted: number;
  repairDurations: number[];
  completionTimes: Date[];
}

interface Bucket extends BucketKey {
  metrics: BucketMetrics;
}

const normalizeTenant = (tenantId: string | Types.ObjectId): Types.ObjectId => {
  if (tenantId instanceof Types.ObjectId) return tenantId;
  if (!Types.ObjectId.isValid(tenantId)) {
    throw new Error('Invalid tenant context');
  }
  return new Types.ObjectId(tenantId);
};

const normalizeIdList = (values?: string[]): Types.ObjectId[] | undefined => {
  if (!values || values.length === 0) return undefined;
  const parsed = values
    .map((value) => (Types.ObjectId.isValid(value) ? new Types.ObjectId(value) : null))
    .filter((value): value is Types.ObjectId => Boolean(value));
  return parsed.length ? parsed : undefined;
};

const startOfPeriod = (value: Date, granularity: MetricsGranularity): Date => {
  const date = new Date(value);
  if (granularity === 'month') {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  }
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
};

const safeDivide = (numerator: number, denominator: number): number => {
  if (!denominator) return 0;
  return numerator / denominator;
};

const ensureBucket = (map: Map<string, Bucket>, key: BucketKey): Bucket => {
  const mapKey = [
    key.tenantId.toString(),
    key.period.toISOString(),
    key.granularity,
    key.siteId?.toString() ?? '-',
    key.lineId?.toString() ?? '-',
    key.assetId?.toString() ?? '-',
  ].join('|');

  const existing = map.get(mapKey);
  if (existing) return existing;

  const bucket: Bucket = {
    ...key,
    metrics: {
      workOrders: 0,
      completedWorkOrders: 0,
      downtimeMinutes: 0,
      pmTotal: 0,
      pmCompleted: 0,
      repairDurations: [],
      completionTimes: [],
    },
  };

  map.set(mapKey, bucket);
  return bucket;
};

const recordWorkOrder = (bucket: Bucket, workOrder: { completedAt?: Date | null; createdAt?: Date | null; timeSpentMin?: number | null; downtimeMinutes?: number | null; downtime?: number | null; type?: string | null; status?: string | null }) => {
  const metrics = bucket.metrics;
  metrics.workOrders += 1;

  const downtimeMinutes =
    typeof workOrder.downtimeMinutes === 'number'
      ? workOrder.downtimeMinutes
      : typeof workOrder.downtime === 'number'
      ? workOrder.downtime * 60
      : 0;
  metrics.downtimeMinutes += downtimeMinutes;

  if (workOrder.type === 'preventive') {
    metrics.pmTotal += 1;
    if (workOrder.status === 'completed') metrics.pmCompleted += 1;
  }

  if (workOrder.status === 'completed' && workOrder.completedAt) {
    metrics.completedWorkOrders += 1;
    const completed = workOrder.completedAt.getTime();
    const started = workOrder.createdAt?.getTime();
    const durationFromTimestamps = started ? Math.max(completed - started, 0) / 36e5 : undefined;
    const durationFromTimeSpent =
      typeof workOrder.timeSpentMin === 'number' && workOrder.timeSpentMin > 0
        ? workOrder.timeSpentMin / 60
        : undefined;

    const duration = durationFromTimeSpent ?? durationFromTimestamps;
    if (typeof duration === 'number') metrics.repairDurations.push(duration);
    metrics.completionTimes.push(workOrder.completedAt);
  }
};

const finalizeBucket = (bucket: Bucket): Omit<MetricsRollupDocument, 'createdAt' | 'updatedAt' | '_id'> => {
  const metrics = bucket.metrics;
  const mttr = metrics.repairDurations.length
    ? metrics.repairDurations.reduce((acc, cur) => acc + cur, 0) / metrics.repairDurations.length
    : 0;

  const mtbf = (() => {
    if (metrics.completionTimes.length < 2) return 0;
    const sorted = [...metrics.completionTimes].sort((a, b) => a.getTime() - b.getTime());
    const deltas = sorted.slice(1).map((date, index) => {
      const prev = sorted[index];
      return (date.getTime() - prev.getTime()) / 36e5;
    });
    return safeDivide(deltas.reduce((acc, cur) => acc + cur, 0), deltas.length);
  })();

  const pmCompliance = metrics.pmTotal ? (metrics.pmCompleted / metrics.pmTotal) * 100 : 0;

  return {
    tenantId: bucket.tenantId,
    siteId: bucket.siteId,
    lineId: bucket.lineId,
    assetId: bucket.assetId,
    period: bucket.period,
    granularity: bucket.granularity,
    workOrders: metrics.workOrders,
    completedWorkOrders: metrics.completedWorkOrders,
    mttrHours: Number(mttr.toFixed(2)),
    mtbfHours: Number(mtbf.toFixed(2)),
    pmTotal: metrics.pmTotal,
    pmCompleted: metrics.pmCompleted,
    pmCompliance: Number(pmCompliance.toFixed(1)),
    downtimeMinutes: Number(metrics.downtimeMinutes.toFixed(2)),
  };
};

export async function upsertMetricsRollups(
  tenantId: string | Types.ObjectId,
  granularity: MetricsGranularity,
  start: Date,
  end: Date,
): Promise<MetricsRollupDocument[]> {
  const normalizedTenantId = normalizeTenant(tenantId);
  const workOrders = await WorkOrder.find({
    tenantId: normalizedTenantId,
    $or: [
      { createdAt: { $gte: start, $lt: end } },
      { completedAt: { $gte: start, $lt: end } },
    ],
  })
    .select('createdAt completedAt status type assetId siteId line downtimeMinutes downtime timeSpentMin')
    .lean();

  const bucketMap = new Map<string, Bucket>();

  workOrders.forEach((order) => {
    const period = startOfPeriod(order.completedAt ?? order.createdAt ?? start, granularity);
    const baseKey: BucketKey = { tenantId: normalizedTenantId, period, granularity };
    const siteKey: BucketKey = order.siteId ? { ...baseKey, siteId: order.siteId as Types.ObjectId } : baseKey;
    const lineKey: BucketKey = order.line
      ? { ...siteKey, lineId: order.line as Types.ObjectId }
      : siteKey;
    const assetKey: BucketKey = order.assetId
      ? { ...lineKey, assetId: order.assetId as Types.ObjectId }
      : lineKey;

    [baseKey, siteKey, lineKey, assetKey].forEach((key) => {
      const bucket = ensureBucket(bucketMap, key);
      recordWorkOrder(bucket, order);
    });
  });

  if (!bucketMap.size) return [];

  const siteIds = new Set<string>();
  const lineIds = new Set<string>();
  const assetIds = new Set<string>();

  bucketMap.forEach((bucket) => {
    if (bucket.siteId) siteIds.add(bucket.siteId.toString());
    if (bucket.lineId) lineIds.add(bucket.lineId.toString());
    if (bucket.assetId) assetIds.add(bucket.assetId.toString());
  });

  const [siteDocs, lineDocs, assetDocs] = await Promise.all([
    siteIds.size
      ? Site.find({ _id: { $in: Array.from(siteIds).map((id) => new Types.ObjectId(id)) } })
          .select('name')
          .lean()
      : [],
    lineIds.size
      ? Line.find({ _id: { $in: Array.from(lineIds).map((id) => new Types.ObjectId(id)) } })
          .select('name siteId')
          .lean()
      : [],
    assetIds.size
      ? Asset.find({ _id: { $in: Array.from(assetIds).map((id) => new Types.ObjectId(id)) } })
          .select('name siteId line')
          .lean()
      : [],
  ]);

  const siteNames = new Map<string, string>();
  siteDocs.forEach((doc) => siteNames.set(doc._id.toString(), doc.name));

  const lineNames = new Map<string, { name?: string; siteId?: string }>();
  lineDocs.forEach((doc) => lineNames.set(doc._id.toString(), { name: doc.name, siteId: doc.siteId?.toString() }));

  const assetNames = new Map<string, { name?: string; siteId?: string; lineId?: string }>();
  assetDocs.forEach((doc) =>
    assetNames.set(doc._id.toString(), {
      name: doc.name,
      siteId: doc.siteId?.toString(),
      lineId: (doc as { line?: Types.ObjectId }).line?.toString(),
    }),
  );

  const docs: MetricsRollupDocument[] = [];
  for (const bucket of bucketMap.values()) {
    const finalized = finalizeBucket(bucket);
    const siteName = finalized.siteId ? siteNames.get(finalized.siteId.toString()) : undefined;
    const lineName = finalized.lineId ? lineNames.get(finalized.lineId.toString())?.name : undefined;
    const assetName = finalized.assetId ? assetNames.get(finalized.assetId.toString())?.name : undefined;

    const doc = await MetricsRollup.findOneAndUpdate(
      {
        tenantId: finalized.tenantId,
        period: finalized.period,
        granularity: finalized.granularity,
        siteId: finalized.siteId,
        lineId: finalized.lineId,
        assetId: finalized.assetId,
      },
      {
        $set: {
          ...finalized,
          siteName,
          lineName,
          assetName,
        },
      },
      { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true },
    ).lean();

    docs.push(doc);
  }

  return docs;
}

const collectWeightedMetric = (
  existing: MetricsRollupBreakdownRow,
  doc: MetricsRollupDocument,
): MetricsRollupBreakdownRow => {
  const completed = existing.completedWorkOrders + doc.completedWorkOrders;
  const workOrders = existing.workOrders + doc.workOrders;
  const mttr = completed
    ? safeDivide(
        existing.mttrHours * existing.completedWorkOrders + doc.mttrHours * doc.completedWorkOrders,
        completed,
      )
    : 0;
  const mtbf = completed
    ? safeDivide(
        existing.mtbfHours * existing.completedWorkOrders + doc.mtbfHours * doc.completedWorkOrders,
        completed,
      )
    : 0;

  const pmCompleted = existing.pmCompleted + doc.pmCompleted;
  const pmTotal = existing.pmTotal + doc.pmTotal;
  const pmCompliance = pmTotal ? (pmCompleted / pmTotal) * 100 : 0;

  return {
    ...existing,
    workOrders,
    completedWorkOrders: completed,
    downtimeMinutes: existing.downtimeMinutes + doc.downtimeMinutes,
    mttrHours: Number(mttr.toFixed(2)),
    mtbfHours: Number(mtbf.toFixed(2)),
    pmCompleted,
    pmTotal,
    pmCompliance: Number(pmCompliance.toFixed(1)),
  };
};

const summarizeBreakdown = (
  docs: MetricsRollupDocument[],
): { breakdown: MetricsRollupBreakdownRow[]; totals: MetricsRollupBreakdownRow } => {
  const baseline: MetricsRollupBreakdownRow = {
    scope: 'tenant',
    workOrders: 0,
    completedWorkOrders: 0,
    mttrHours: 0,
    mtbfHours: 0,
    pmCompleted: 0,
    pmTotal: 0,
    pmCompliance: 0,
    downtimeMinutes: 0,
  };

  const totals = docs.reduce((acc, doc) => collectWeightedMetric(acc, doc), baseline);

  const byScope = new Map<string, MetricsRollupBreakdownRow>();
  const upsert = (scope: MetricsRollupBreakdownRow['scope'], id: string | undefined, name: string | undefined, doc: MetricsRollupDocument) => {
    const key = `${scope}:${id ?? 'all'}`;
    const existing =
      byScope.get(key) ?? {
        ...baseline,
        scope,
        id,
        name,
      };
    byScope.set(key, collectWeightedMetric(existing, doc));
  };

  docs.forEach((doc) => {
    if (doc.assetId) {
      upsert('asset', doc.assetId.toString(), doc.assetName, doc);
    } else if (doc.lineId) {
      upsert('line', doc.lineId.toString(), doc.lineName, doc);
    } else if (doc.siteId) {
      upsert('site', doc.siteId.toString(), doc.siteName, doc);
    }
  });

  return { breakdown: Array.from(byScope.values()), totals };
};

export async function getMetricsRollupSummary(
  tenantId: string | Types.ObjectId,
  filters: MetricsRollupFilters,
): Promise<MetricsRollupSummary> {
  const normalizedTenantId = normalizeTenant(tenantId);
  const siteFilter = normalizeIdList(filters.siteIds);
  const lineFilter = normalizeIdList(filters.lineIds);
  const assetFilter = normalizeIdList(filters.assetIds);

  const dateRange = (() => {
    if (!filters.startDate && !filters.endDate) return undefined;
    const range: { $gte?: Date; $lte?: Date } = {};
    if (filters.startDate) range.$gte = filters.startDate;
    if (filters.endDate) range.$lte = filters.endDate;
    return range;
  })();

  const query: Record<string, unknown> = { tenantId: normalizedTenantId };
  if (dateRange) query.period = dateRange;
  if (filters.granularity) query.granularity = filters.granularity;
  if (siteFilter) query.siteId = { $in: siteFilter };
  if (lineFilter) query.lineId = { $in: lineFilter };
  if (assetFilter) query.assetId = { $in: assetFilter };

  const docs = await MetricsRollup.find(query).lean();
  const { breakdown, totals } = summarizeBreakdown(docs);

  const availableSites = new Map<string, { id: string; name?: string }>();
  const availableLines = new Map<string, { id: string; name?: string; siteId?: string }>();
  const availableAssets = new Map<string, { id: string; name?: string; siteId?: string; lineId?: string }>();

  docs.forEach((doc) => {
    if (doc.siteId) {
      availableSites.set(doc.siteId.toString(), { id: doc.siteId.toString(), name: doc.siteName });
    }
    if (doc.lineId) {
      availableLines.set(doc.lineId.toString(), {
        id: doc.lineId.toString(),
        name: doc.lineName,
        siteId: doc.siteId?.toString(),
      });
    }
    if (doc.assetId) {
      availableAssets.set(doc.assetId.toString(), {
        id: doc.assetId.toString(),
        name: doc.assetName,
        siteId: doc.siteId?.toString(),
        lineId: doc.lineId?.toString(),
      });
    }
  });

  return {
    range: {
      start: filters.startDate?.toISOString(),
      end: filters.endDate?.toISOString(),
      granularity: filters.granularity ?? 'day',
    },
    totals,
    breakdown: breakdown.sort((a, b) => b.downtimeMinutes - a.downtimeMinutes),
    availableFilters: {
      sites: Array.from(availableSites.values()),
      lines: Array.from(availableLines.values()),
      assets: Array.from(availableAssets.values()),
    },
  };
}

export async function getMetricsRollupDetails(
  tenantId: string | Types.ObjectId,
  filters: MetricsRollupFilters,
  limit = 100,
): Promise<MetricsRollupDetailsResponse> {
  const normalizedTenantId = normalizeTenant(tenantId);
  const siteFilter = normalizeIdList(filters.siteIds);
  const lineFilter = normalizeIdList(filters.lineIds);
  const assetFilter = normalizeIdList(filters.assetIds);

  const dateRange = (() => {
    if (!filters.startDate && !filters.endDate) return undefined;
    const range: { $gte?: Date; $lte?: Date } = {};
    if (filters.startDate) range.$gte = filters.startDate;
    if (filters.endDate) range.$lte = filters.endDate;
    return range;
  })();

  const workOrderQuery: Record<string, unknown> = { tenantId: normalizedTenantId };
  if (dateRange) {
    workOrderQuery.$or = [
      { createdAt: dateRange },
      { completedAt: dateRange },
    ];
  }
  if (siteFilter) workOrderQuery.siteId = { $in: siteFilter };
  if (lineFilter) workOrderQuery.line = { $in: lineFilter };
  if (assetFilter) workOrderQuery.assetId = { $in: assetFilter };

  const orders = await WorkOrder.find(workOrderQuery)
    .select(
      'title status type priority createdAt completedAt assetId siteId line downtimeMinutes downtime timeSpentMin pmTask',
    )
    .sort({ completedAt: -1 })
    .limit(limit)
    .lean();

  if (!orders.length) return { workOrders: [] };

  const siteIds = new Set<string>();
  const lineIds = new Set<string>();
  const assetIds = new Set<string>();
  const pmTaskIds = new Set<string>();

  orders.forEach((order) => {
    if (order.siteId) siteIds.add(order.siteId.toString());
    if (order.line) lineIds.add(order.line.toString());
    if (order.assetId) assetIds.add(order.assetId.toString());
    if (order.pmTask) pmTaskIds.add(order.pmTask.toString());
  });

  const [siteDocs, lineDocs, assetDocs, pmTasks] = await Promise.all([
    siteIds.size
      ? Site.find({ _id: { $in: Array.from(siteIds).map((id) => new Types.ObjectId(id)) } })
          .select('name')
          .lean()
      : [],
    lineIds.size
      ? Line.find({ _id: { $in: Array.from(lineIds).map((id) => new Types.ObjectId(id)) } })
          .select('name')
          .lean()
      : [],
    assetIds.size
      ? Asset.find({ _id: { $in: Array.from(assetIds).map((id) => new Types.ObjectId(id)) } })
          .select('name')
          .lean()
      : [],
    pmTaskIds.size
      ? PMTask.find({ _id: { $in: Array.from(pmTaskIds).map((id) => new Types.ObjectId(id)) } })
          .select('title')
          .lean()
      : [],
  ]);

  const siteNames = new Map<string, string>();
  siteDocs.forEach((doc) => siteNames.set(doc._id.toString(), doc.name));

  const lineNames = new Map<string, string>();
  lineDocs.forEach((doc) => lineNames.set(doc._id.toString(), doc.name));

  const assetNames = new Map<string, string>();
  assetDocs.forEach((doc) => assetNames.set(doc._id.toString(), doc.name));

  const pmTaskNames = new Map<string, string>();
  pmTasks.forEach((task) => pmTaskNames.set(task._id.toString(), task.title));

  const workOrders: MetricsRollupDetail[] = orders.map((order) => {
    const downtimeMinutes =
      typeof order.downtimeMinutes === 'number'
        ? order.downtimeMinutes
        : typeof order.downtime === 'number'
        ? order.downtime * 60
        : undefined;

    const timeSpentMinutes = typeof order.timeSpentMin === 'number' ? order.timeSpentMin : undefined;

    return {
      id: order._id.toString(),
      title: order.title,
      status: order.status,
      type: order.type,
      priority: order.priority,
      createdAt: order.createdAt?.toISOString(),
      completedAt: order.completedAt?.toISOString(),
      downtimeMinutes,
      timeSpentMinutes,
      assetId: order.assetId?.toString(),
      assetName: order.assetId ? assetNames.get(order.assetId.toString()) : undefined,
      siteId: order.siteId?.toString(),
      siteName: order.siteId ? siteNames.get(order.siteId.toString()) : undefined,
      lineId: (order as { line?: Types.ObjectId }).line?.toString(),
      lineName: (order as { line?: Types.ObjectId }).line
        ? lineNames.get((order as { line?: Types.ObjectId }).line!.toString())
        : undefined,
      pmTaskId: order.pmTask?.toString(),
      pmTaskTitle: order.pmTask ? pmTaskNames.get(order.pmTask.toString()) : undefined,
    };
  });

  return { workOrders };
}
