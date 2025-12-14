/*
 * SPDX-License-Identifier: MIT
 */

import { Types } from 'mongoose';

import AnalyticsSnapshot, { type Granularity } from '../../../models/AnalyticsSnapshot';
import Asset from '../../../models/Asset';
import Site from '../../../models/Site';
import User from '../../../models/User';
import WorkHistory from '../../../models/WorkHistory';
import WorkOrderModel, { type WorkOrder } from '../../../models/WorkOrder';

export type TenantId = string | Types.ObjectId;

export interface SnapshotQuery {
  from?: Date;
  to?: Date;
  granularity?: Granularity;
  scope?: 'site' | 'asset' | 'technician' | 'overall';
}

export interface SnapshotDto {
  period: string;
  granularity: Granularity;
  siteId?: string;
  siteName?: string;
  assetId?: string;
  assetName?: string;
  technicianId?: string;
  technicianName?: string;
  mtbfHours: number;
  mttrHours: number;
  responseSlaRate: number;
  resolutionSlaRate: number;
  technicianUtilization: number;
  downtimeHours: number;
  maintenanceCost: number;
}

export interface LeaderboardEntry {
  id?: string;
  label: string;
  downtimeHours: number;
  mttrHours: number;
  maintenanceCost: number;
  responseSlaRate?: number;
  resolutionSlaRate?: number;
  technicianUtilization?: number;
}

export interface LeaderboardDto {
  sites: LeaderboardEntry[];
  assets: LeaderboardEntry[];
  technicians: LeaderboardEntry[];
}

export interface ComparisonRow {
  siteId?: string;
  siteName?: string;
  downtimeHours: number;
  maintenanceCost: number;
  mtbfHours: number;
  mttrHours: number;
  responseSlaRate: number;
  resolutionSlaRate: number;
}

export interface ComparisonDto {
  range: { from: string; to: string; granularity: Granularity };
  comparisons: ComparisonRow[];
}

type DimensionKey =
  | 'site'
  | 'asset'
  | 'technician'
  | 'site-asset'
  | 'site-technician'
  | 'overall';

interface BucketKey {
  tenantId: Types.ObjectId;
  period: Date;
  granularity: Granularity;
  siteId?: Types.ObjectId;
  assetId?: Types.ObjectId;
  technicianId?: Types.ObjectId;
}

interface BucketMetrics {
  failures: number;
  repairHours: number;
  downtimeHours: number;
  costs: number;
  slaCandidates: number;
  slaResolveMet: number;
  slaResponseMet: number;
  utilizationHours: number;
  completionTimes: Date[];
}

interface Bucket extends BucketKey {
  metrics: BucketMetrics;
}

const normalizeTenant = (tenantId: TenantId): Types.ObjectId => {
  if (tenantId instanceof Types.ObjectId) return tenantId;
  if (!Types.ObjectId.isValid(tenantId)) {
    throw new Error('Invalid tenant context');
  }
  return new Types.ObjectId(tenantId);
};

const startOfPeriod = (value: Date, granularity: Granularity): Date => {
  const date = new Date(value);
  if (granularity === 'month') {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  }
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
};

const periodHours = (period: Date, granularity: Granularity): number => {
  if (granularity === 'month') {
    const first = new Date(period);
    const next = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 1));
    return Math.max(24, (next.getTime() - first.getTime()) / (1000 * 60 * 60));
  }
  return 24;
};

const toBucketKey = ({ tenantId, period, granularity, siteId, assetId, technicianId }: BucketKey) =>
  [
    tenantId.toString(),
    period.toISOString(),
    granularity,
    siteId?.toString() ?? '-',
    assetId?.toString() ?? '-',
    technicianId?.toString() ?? '-',
  ].join('|');

const ensureBucket = (map: Map<string, Bucket>, key: BucketKey): Bucket => {
  const mapKey = toBucketKey(key);
  const existing = map.get(mapKey);
  if (existing) return existing;
  const bucket: Bucket = {
    ...key,
    metrics: {
      failures: 0,
      repairHours: 0,
      downtimeHours: 0,
      costs: 0,
      slaCandidates: 0,
      slaResolveMet: 0,
      slaResponseMet: 0,
      utilizationHours: 0,
      completionTimes: [],
    },
  };
  map.set(mapKey, bucket);
  return bucket;
};

const getCostTotal = (workOrder: WorkOrder) => {
  const fromTotal = typeof workOrder.totalCost === 'number' ? workOrder.totalCost : 0;
  const fromParts = typeof workOrder.partsCost === 'number' ? workOrder.partsCost : 0;
  const fromLabor = typeof workOrder.laborCost === 'number' ? workOrder.laborCost : 0;
  const fromMisc = typeof workOrder.miscCost === 'number' ? workOrder.miscCost : 0;
  const fromMiscellaneous = typeof workOrder.miscellaneousCost === 'number' ? workOrder.miscellaneousCost : 0;
  return fromTotal || fromParts + fromLabor + fromMisc + fromMiscellaneous;
};

const computeResponseMet = (workOrder: WorkOrder): { response: boolean; resolve: boolean; candidates: number } => {
  const startedAt = workOrder.requestedAt ?? workOrder.createdAt ?? workOrder.completedAt ?? null;
  const resolvedAt = workOrder.slaResolvedAt ?? workOrder.completedAt ?? null;
  const respondedAt = workOrder.slaRespondedAt ?? resolvedAt ?? workOrder.updatedAt ?? null;

  const responseDeadline = workOrder.slaResponseDueAt ?? (workOrder.slaHours
    ? startedAt && new Date(startedAt.getTime() + workOrder.slaHours * 60 * 60 * 1000)
    : workOrder.slaDueAt);
  const resolveDeadline = workOrder.slaResolveDueAt ?? workOrder.slaDueAt;

  const hasCandidate = Boolean(responseDeadline || resolveDeadline);
  if (!hasCandidate || !startedAt) return { response: false, resolve: false, candidates: 0 };

  const responseMet = responseDeadline ? Boolean(respondedAt && respondedAt.getTime() <= responseDeadline.getTime()) : false;
  const resolveMet = resolveDeadline ? Boolean(resolvedAt && resolvedAt.getTime() <= resolveDeadline.getTime()) : false;

  return { response: responseDeadline ? responseMet : false, resolve: resolveDeadline ? resolveMet : false, candidates: 1 };
};

const updateBucketFromWorkOrder = (
  bucket: Bucket,
  workOrder: WorkOrder,
  granularity: Granularity,
) => {
  const metrics = bucket.metrics;
  const downtimeMinutes =
    typeof workOrder.downtimeMinutes === 'number'
      ? workOrder.downtimeMinutes
      : typeof workOrder.downtime === 'number'
      ? workOrder.downtime * 60
      : 0;
  const repairHours =
    typeof workOrder.laborHours === 'number'
      ? workOrder.laborHours
      : typeof workOrder.timeSpentMin === 'number'
      ? workOrder.timeSpentMin / 60
      : 0;

  metrics.downtimeHours += downtimeMinutes / 60;
  metrics.repairHours += repairHours;
  metrics.costs += getCostTotal(workOrder);

  if (workOrder.type === 'corrective' && workOrder.completedAt) {
    metrics.failures += 1;
    metrics.completionTimes.push(workOrder.completedAt);
  }

  const sla = computeResponseMet(workOrder);
  metrics.slaCandidates += sla.candidates;
  metrics.slaResolveMet += sla.resolve ? 1 : 0;
  metrics.slaResponseMet += sla.response ? 1 : 0;

  // technician utilization for assigned users
  const hoursPerTech = metricsUtilizationPerTechnician(workOrder, granularity);
  if (hoursPerTech > 0) {
    metrics.utilizationHours += hoursPerTech;
  }
};

const metricsUtilizationPerTechnician = (workOrder: WorkOrder, granularity: Granularity) => {
  const technicianCount = (workOrder.assignees?.length ?? 0) || (workOrder.assignedTo ? 1 : 0);
  if (!technicianCount) return 0;
  const hours =
    typeof workOrder.laborHours === 'number'
      ? workOrder.laborHours
      : typeof workOrder.timeSpentMin === 'number'
      ? workOrder.timeSpentMin / 60
      : granularity === 'day'
      ? 1
      : 4;
  return hours / technicianCount;
};

const finalizeBucket = (bucket: Bucket): SnapshotDto => {
  const metrics = bucket.metrics;
  const baseHours = periodHours(bucket.period, bucket.granularity);
  const mttr = metrics.failures ? metrics.repairHours / metrics.failures : 0;

  let mtbf = baseHours;
  if (metrics.completionTimes.length > 1) {
    const sorted = metrics.completionTimes.sort((a, b) => a.getTime() - b.getTime());
    const deltas = sorted.slice(1).map((date, index) => {
      const prev = sorted[index];
      return (date.getTime() - prev.getTime()) / (1000 * 60 * 60);
    });
    const totalDelta = deltas.reduce((acc, cur) => acc + cur, 0);
    mtbf = totalDelta / deltas.length;
  }

  const slaDenominator = Math.max(1, metrics.slaCandidates);
  const responseRate = (metrics.slaResponseMet / slaDenominator) * 100;
  const resolutionRate = (metrics.slaResolveMet / slaDenominator) * 100;

  const utilizationCapacity = bucket.granularity === 'month' ? (baseHours / 24) * 8 : 8;
  const utilization = utilizationCapacity > 0 ? (metrics.utilizationHours / utilizationCapacity) * 100 : 0;

  return {
    period: bucket.period.toISOString(),
    granularity: bucket.granularity,
    siteId: bucket.siteId?.toString(),
    assetId: bucket.assetId?.toString(),
    technicianId: bucket.technicianId?.toString(),
    mtbfHours: Number(mtbf.toFixed(2)),
    mttrHours: Number(mttr.toFixed(2)),
    responseSlaRate: Number(responseRate.toFixed(1)),
    resolutionSlaRate: Number(resolutionRate.toFixed(1)),
    technicianUtilization: Number(utilization.toFixed(1)),
    downtimeHours: Number(metrics.downtimeHours.toFixed(2)),
    maintenanceCost: Number(metrics.costs.toFixed(2)),
  };
};

const fetchTechnicianHours = async (
  tenantId: Types.ObjectId,
  from: Date,
  to: Date,
): Promise<Map<string, number>> => {
  const hours = new Map<string, number>();
  const entries = await WorkHistory.find({ tenantId, completedAt: { $gte: from, $lte: to } })
    .select(['performedBy', 'timeSpentHours'])
    .lean();
  entries.forEach((entry) => {
    if (!entry.performedBy) return;
    const key = entry.performedBy.toString();
    const value = typeof entry.timeSpentHours === 'number' ? entry.timeSpentHours : 0;
    hours.set(key, (hours.get(key) ?? 0) + value);
  });
  return hours;
};

export async function buildAnalyticsSnapshots(
  tenantId: TenantId,
  query: SnapshotQuery = {},
): Promise<SnapshotDto[]> {
  const normalizedTenantId = normalizeTenant(tenantId);
  const granularity: Granularity = query.granularity ?? 'month';
  const now = new Date();
  const from = query.from ? startOfPeriod(query.from, granularity) : startOfPeriod(now, granularity);
  const to = query.to ? query.to : now;

  const buckets = new Map<string, Bucket>();

  const workOrders = await WorkOrderModel.find({
    tenantId: normalizedTenantId,
    completedAt: { $lte: to },
    status: 'completed',
  })
    .where('completedAt')
    .gte(from.getTime())
    .lean();

  workOrders.forEach((order) => {
    if (!order.completedAt) return;
    const period = startOfPeriod(order.completedAt, granularity);

    const baseKey: BucketKey = { tenantId: normalizedTenantId, period, granularity };
    const siteKey: BucketKey = order.siteId
      ? { ...baseKey, siteId: order.siteId as Types.ObjectId }
      : baseKey;
    const assetKey: BucketKey = order.assetId
      ? { ...baseKey, assetId: order.assetId as Types.ObjectId, siteId: order.siteId as Types.ObjectId }
      : siteKey;

    const overallBucket = ensureBucket(buckets, baseKey);
    updateBucketFromWorkOrder(overallBucket, order, granularity);

    const siteBucket = ensureBucket(buckets, siteKey);
    updateBucketFromWorkOrder(siteBucket, order, granularity);

    if (order.assetId) {
      const assetBucket = ensureBucket(buckets, assetKey);
      updateBucketFromWorkOrder(assetBucket, order, granularity);
    }

    if (order.assignedTo) {
      const technicianBucket = ensureBucket(buckets, {
        ...baseKey,
        technicianId: order.assignedTo as Types.ObjectId,
        siteId: order.siteId as Types.ObjectId,
      });
      updateBucketFromWorkOrder(technicianBucket, order, granularity);
    }

    if (order.assignees && order.assignees.length) {
      order.assignees.forEach((assignee) => {
        const technicianBucket = ensureBucket(buckets, {
          ...baseKey,
          technicianId: assignee as Types.ObjectId,
          siteId: order.siteId as Types.ObjectId,
        });
        updateBucketFromWorkOrder(technicianBucket, order, granularity);
      });
    }
  });

  // incorporate manual time tracking for utilization
  const technicianHours = await fetchTechnicianHours(normalizedTenantId, from, to);
  technicianHours.forEach((hours, technicianId) => {
    const bucket = ensureBucket(buckets, {
      tenantId: normalizedTenantId,
      period: startOfPeriod(from, granularity),
      granularity,
      technicianId: new Types.ObjectId(technicianId),
    });
    bucket.metrics.utilizationHours += hours;
  });

  const snapshots = Array.from(buckets.values()).map(finalizeBucket);
  const scopedSnapshots = query.scope
    ? snapshots.filter((snapshot) => {
        if (query.scope === 'site') return Boolean(snapshot.siteId) && !snapshot.assetId;
        if (query.scope === 'asset') return Boolean(snapshot.assetId);
        if (query.scope === 'technician') return Boolean(snapshot.technicianId);
        return !snapshot.siteId && !snapshot.assetId && !snapshot.technicianId;
      })
    : snapshots;

  return scopedSnapshots;
}

const hydrateMetadata = async (
  tenantId: Types.ObjectId,
  snapshots: SnapshotDto[],
): Promise<SnapshotDto[]> => {
  const siteIds = Array.from(
    new Set(
      snapshots
        .map((snapshot) => snapshot.siteId)
        .filter((id): id is string => Boolean(id)),
    ),
  );
  const assetIds = Array.from(
    new Set(
      snapshots
        .map((snapshot) => snapshot.assetId)
        .filter((id): id is string => Boolean(id)),
    ),
  );
  const technicianIds = Array.from(
    new Set(
      snapshots
        .map((snapshot) => snapshot.technicianId)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  const [sites, assets, technicians] = await Promise.all([
    Site.find({ tenantId, _id: { $in: siteIds } })
      .select(['_id', 'name'])
      .lean(),
    Asset.find({ tenantId, _id: { $in: assetIds } })
      .select(['_id', 'name'])
      .lean(),
    User.find({ tenantId, _id: { $in: technicianIds } })
      .select(['_id', 'name', 'email'])
      .lean(),
  ]);

  const siteMap = new Map(sites.map((site) => [site._id.toString(), site.name]));
  const assetMap = new Map(assets.map((asset) => [asset._id.toString(), asset.name]));
  const technicianMap = new Map(
    technicians.map((tech) => [tech._id.toString(), tech.name || tech.email || 'Technician']),
  );

  return snapshots.map((snapshot) => ({
    ...snapshot,
    siteName: snapshot.siteId ? siteMap.get(snapshot.siteId) : undefined,
    assetName: snapshot.assetId ? assetMap.get(snapshot.assetId) : undefined,
    technicianName: snapshot.technicianId ? technicianMap.get(snapshot.technicianId) : undefined,
  }));
};

export async function persistSnapshots(
  tenantId: TenantId,
  query: SnapshotQuery,
): Promise<SnapshotDto[]> {
  const normalizedTenantId = normalizeTenant(tenantId);
  const snapshots = await buildAnalyticsSnapshots(normalizedTenantId, query);
  const hydrated = await hydrateMetadata(normalizedTenantId, snapshots);

  if (!hydrated.length) return hydrated;

  await AnalyticsSnapshot.bulkWrite(
      hydrated.map((snapshot) => ({
        updateOne: {
          filter: {
            tenantId: normalizedTenantId,
            period: new Date(snapshot.period),
            granularity: snapshot.granularity,
            ...(snapshot.siteId
              ? { siteId: new Types.ObjectId(snapshot.siteId) }
              : { siteId: { $exists: false } }),
            ...(snapshot.assetId
              ? { assetId: new Types.ObjectId(snapshot.assetId) }
              : { assetId: { $exists: false } }),
            ...(snapshot.technicianId
              ? { technicianId: new Types.ObjectId(snapshot.technicianId) }
              : { technicianId: { $exists: false } }),
          },
        update: {
          $set: {
            mtbfHours: snapshot.mtbfHours,
            mttrHours: snapshot.mttrHours,
            responseSlaRate: snapshot.responseSlaRate,
            resolutionSlaRate: snapshot.resolutionSlaRate,
            technicianUtilization: snapshot.technicianUtilization,
            downtimeHours: snapshot.downtimeHours,
            maintenanceCost: snapshot.maintenanceCost,
            siteName: snapshot.siteName,
            assetName: snapshot.assetName,
            technicianName: snapshot.technicianName,
          },
          $setOnInsert: {
            tenantId: normalizedTenantId,
            period: new Date(snapshot.period),
            granularity: snapshot.granularity,
            siteId: snapshot.siteId ? new Types.ObjectId(snapshot.siteId) : undefined,
            assetId: snapshot.assetId ? new Types.ObjectId(snapshot.assetId) : undefined,
            technicianId: snapshot.technicianId ? new Types.ObjectId(snapshot.technicianId) : undefined,
          },
        },
        upsert: true,
      },
    })),
  );

  return hydrated;
}

export async function getSnapshotsFromWarehouse(
  tenantId: TenantId,
  query: SnapshotQuery,
): Promise<SnapshotDto[]> {
  const normalizedTenantId = normalizeTenant(tenantId);
  const granularity: Granularity = query.granularity ?? 'month';
  const now = new Date();
  const from = query.from ? startOfPeriod(query.from, granularity) : startOfPeriod(now, granularity);
  const to = query.to ?? now;

  const filters: Record<string, unknown> = {
    tenantId: normalizedTenantId,
    granularity,
    period: { $gte: from, $lte: to },
  };

  if (query.scope === 'site') {
    filters.siteId = { $ne: null };
    filters.assetId = null;
    filters.technicianId = null;
  }
  if (query.scope === 'asset') {
    filters.assetId = { $ne: null };
  }
  if (query.scope === 'technician') {
    filters.technicianId = { $ne: null };
  }
  if (query.scope === 'overall') {
    filters.siteId = null;
    filters.assetId = null;
    filters.technicianId = null;
  }

  const snapshots = await AnalyticsSnapshot.find(filters).sort({ period: 1 }).lean();
  const mapped: SnapshotDto[] = snapshots.map((doc) => ({
    period: doc.period.toISOString(),
    granularity: doc.granularity,
    siteId: doc.siteId?.toString(),
    siteName: doc.siteName,
    assetId: doc.assetId?.toString(),
    assetName: doc.assetName,
    technicianId: doc.technicianId?.toString(),
    technicianName: doc.technicianName,
    mtbfHours: doc.mtbfHours,
    mttrHours: doc.mttrHours,
    responseSlaRate: doc.responseSlaRate,
    resolutionSlaRate: doc.resolutionSlaRate,
    technicianUtilization: doc.technicianUtilization,
    downtimeHours: doc.downtimeHours,
    maintenanceCost: doc.maintenanceCost,
  }));

  if (mapped.length) return mapped;

  // fallback: compute on the fly when warehouse is empty
  return persistSnapshots(normalizedTenantId, query);
}

const aggregateLeaderboard = (
  snapshots: SnapshotDto[],
  key: DimensionKey,
): LeaderboardEntry[] => {
  const map = new Map<string, LeaderboardEntry>();
  const keyForSnapshot = (snapshot: SnapshotDto): string | null => {
    if (key === 'overall') return 'overall';
    if (key === 'site' && snapshot.siteId) return snapshot.siteId;
    if (key === 'asset' && snapshot.assetId) return snapshot.assetId;
    if (key === 'technician' && snapshot.technicianId) return snapshot.technicianId;
    if (key === 'site-asset' && snapshot.siteId && snapshot.assetId)
      return `${snapshot.siteId}:${snapshot.assetId}`;
    if (key === 'site-technician' && snapshot.siteId && snapshot.technicianId)
      return `${snapshot.siteId}:${snapshot.technicianId}`;
    return null;
  };

  snapshots.forEach((snapshot) => {
    const dimensionKey = keyForSnapshot(snapshot);
    if (!dimensionKey) return;
    const existing = map.get(dimensionKey) ?? {
      id: dimensionKey,
      label:
        snapshot.assetName ||
        snapshot.siteName ||
        snapshot.technicianName ||
        snapshot.siteId ||
        snapshot.assetId ||
        snapshot.technicianId ||
        'Overall',
      downtimeHours: 0,
      mttrHours: 0,
      maintenanceCost: 0,
      responseSlaRate: 0,
      resolutionSlaRate: 0,
      technicianUtilization: 0,
    };
    existing.downtimeHours += snapshot.downtimeHours;
    existing.mttrHours += snapshot.mttrHours;
    existing.maintenanceCost += snapshot.maintenanceCost;
    existing.responseSlaRate = Math.max(existing.responseSlaRate ?? 0, snapshot.responseSlaRate);
    existing.resolutionSlaRate = Math.max(existing.resolutionSlaRate ?? 0, snapshot.resolutionSlaRate);
    existing.technicianUtilization = Math.max(
      existing.technicianUtilization ?? 0,
      snapshot.technicianUtilization,
    );
    map.set(dimensionKey, existing);
  });

  return Array.from(map.values()).sort((a, b) => b.downtimeHours - a.downtimeHours);
};

export async function getLeaderboards(
  tenantId: TenantId,
  query: SnapshotQuery,
): Promise<LeaderboardDto> {
  const snapshots = await getSnapshotsFromWarehouse(tenantId, query);
  return {
    sites: aggregateLeaderboard(snapshots.filter((s) => s.siteId && !s.assetId && !s.technicianId), 'site'),
    assets: aggregateLeaderboard(snapshots.filter((s) => s.assetId), 'asset'),
    technicians: aggregateLeaderboard(snapshots.filter((s) => s.technicianId), 'technician'),
  };
}

export async function getSiteComparisons(
  tenantId: TenantId,
  query: SnapshotQuery,
): Promise<ComparisonDto> {
  const snapshots = await getSnapshotsFromWarehouse(tenantId, { ...query, scope: 'site' });
  const comparisons: ComparisonRow[] = snapshots.map((snapshot) => ({
    siteId: snapshot.siteId,
    siteName: snapshot.siteName,
    downtimeHours: snapshot.downtimeHours,
    maintenanceCost: snapshot.maintenanceCost,
    mtbfHours: snapshot.mtbfHours,
    mttrHours: snapshot.mttrHours,
    responseSlaRate: snapshot.responseSlaRate,
    resolutionSlaRate: snapshot.resolutionSlaRate,
  }));

  return {
    range: {
      from: (query.from ?? new Date()).toISOString(),
      to: (query.to ?? new Date()).toISOString(),
      granularity: query.granularity ?? 'month',
    },
    comparisons: comparisons.sort((a, b) => b.downtimeHours - a.downtimeHours),
  };
}

export async function runWarehouseAggregation(
  tenantId: TenantId,
  granularity: Granularity,
  from: Date,
  to: Date,
): Promise<SnapshotDto[]> {
  return persistSnapshots(tenantId, { from, to, granularity });
}

export async function rebuildWarehouseForTenant(
  tenantId: TenantId,
  months = 3,
): Promise<SnapshotDto[]> {
  const now = new Date();
  const from = new Date(now);
  from.setUTCMonth(from.getUTCMonth() - months);
  return persistSnapshots(tenantId, { from, to: now, granularity: 'month' });
}
