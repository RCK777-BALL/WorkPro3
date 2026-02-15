/*
 * SPDX-License-Identifier: MIT
 */

import type { FilterQuery, Types } from 'mongoose';
import type { Granularity } from '../../../models/AnalyticsSnapshot';
import DowntimeLog from '../../../models/DowntimeLog';
import User from '../../../models/User';
import WorkHistory from '../../../models/WorkHistory';
import WorkOrder from '../../../models/WorkOrder';

export interface TimeWindow {
  start?: Date;
  end?: Date;
  assetIds?: string[];
}

export interface MttrMtbfTrendPoint {
  period: string;
  mttrHours: number;
  mtbfHours: number;
  failures: number;
}

export interface BacklogAgingBucket {
  label: string;
  minDays: number;
  maxDays?: number;
  count: number;
}

export interface BacklogAgingMetrics {
  asOf: string;
  totalOpen: number;
  averageAgeDays: number;
  buckets: BacklogAgingBucket[];
}

export interface SlaPerformancePoint {
  period: string;
  responseRate: number;
  resolutionRate: number;
  candidates: number;
}

export interface TechnicianUtilizationEntry {
  technicianId: string;
  technicianName: string;
  hoursLogged: number;
  capacityHours: number;
  utilizationRate: number;
}

export interface TechnicianUtilizationMetrics {
  range: { start: string; end: string };
  averageUtilization: number;
  technicians: TechnicianUtilizationEntry[];
}

export interface DowntimeCostMetrics {
  range: { start: string; end: string };
  totalHours: number;
  hourlyRate: number;
  totalCost: number;
  currency: string;
}

const asArray = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

const buildDateRange = (field: string, window: TimeWindow): Record<string, unknown> => {
  const range: Record<string, unknown> = {};
  if (window.start) range.$gte = window.start;
  if (window.end) range.$lte = window.end;
  return Object.keys(range).length ? { [field]: range } : {};
};

const applyAssetFilter = (window: TimeWindow): Record<string, unknown> =>
  window.assetIds && window.assetIds.length ? { assetId: { $in: window.assetIds } } : {};

const startOfPeriod = (value: Date, granularity: Granularity): Date => {
  const date = new Date(value);
  if (granularity === 'month') {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  }
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
};

const nextPeriod = (value: Date, granularity: Granularity): Date => {
  const date = new Date(value);
  if (granularity === 'month') {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
  }
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1));
};

const hoursBetween = (start: Date, end: Date): number =>
  Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60));

const daysBetween = (start: Date, end: Date): number =>
  Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

export const calculateReliabilityMetrics = async (
  tenantId: Types.ObjectId | string,
  window: TimeWindow,
): Promise<{ mttrHours: number; mtbfHours: number; eventCount: number }> => {
  const filter: FilterQuery<typeof DowntimeLog> = {
    tenantId,
    ...applyAssetFilter(window),
    ...buildDateRange('start', window),
  } as FilterQuery<typeof DowntimeLog>;

  const events = await DowntimeLog.find(filter).sort({ start: 1 }).lean().exec();

  if (!events.length) return { mttrHours: 0, mtbfHours: 0, eventCount: 0 };

  const durations = events.map((event) => {
    const end = event.end ? new Date(event.end) : new Date();
    return Math.max(0, (end.getTime() - new Date(event.start).getTime()) / (1000 * 60 * 60));
  });

  const mttrHours = durations.reduce((sum, dur) => sum + dur, 0) / durations.length;

  const totalSpanHours =
    events.length > 1
      ? (new Date(events[events.length - 1].start).getTime() - new Date(events[0].start).getTime()) /
        (1000 * 60 * 60)
      : durations[0];
  const mtbfHours = events.length > 1 ? totalSpanHours / (events.length - 1) : totalSpanHours;

  return { mttrHours, mtbfHours, eventCount: events.length };
};

export const calculateBacklogMetrics = async (
  tenantId: Types.ObjectId | string,
  window: TimeWindow,
): Promise<{ size: number; averageAgeDays: number }> => {
  const statusFilter: FilterQuery<typeof WorkOrder> = { status: { $nin: ['completed', 'cancelled'] } };

  const filter: FilterQuery<typeof WorkOrder> = {
    tenantId,
    ...statusFilter,
    ...applyAssetFilter(window),
    ...buildDateRange('createdAt', window),
  } as FilterQuery<typeof WorkOrder>;

  const workOrders = await WorkOrder.find(filter).select('createdAt').lean().exec();
  if (!workOrders.length) return { size: 0, averageAgeDays: 0 };

  const now = window.end ?? new Date();
  const ages = workOrders.map((wo) => {
    const created = wo.createdAt ? new Date(wo.createdAt) : now;
    return Math.max(0, (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
  });

  const averageAgeDays = ages.reduce((sum, age) => sum + age, 0) / ages.length;
  return { size: workOrders.length, averageAgeDays };
};

export const calculateMttrMtbfTrend = async (
  tenantId: Types.ObjectId | string,
  window: TimeWindow,
  granularity: Granularity = 'month',
): Promise<{ range: { start: string; end: string; granularity: Granularity }; series: MttrMtbfTrendPoint[] }> => {
  const end = window.end ?? new Date();
  const start = window.start ?? startOfPeriod(new Date(end.getTime() - 1000 * 60 * 60 * 24 * 180), granularity);

  const filter: FilterQuery<typeof WorkOrder> = {
    tenantId,
    status: 'completed',
    type: 'corrective',
    ...applyAssetFilter(window),
    ...buildDateRange('completedAt', { start, end }),
  } as FilterQuery<typeof WorkOrder>;

  const workOrders = await WorkOrder.find(filter)
    .select(['completedAt', 'laborHours', 'timeSpentMin'])
    .lean()
    .exec();

  const buckets = new Map<string, { period: Date; failures: number; repairHours: number; completionTimes: Date[] }>();

  const ensureBucket = (period: Date) => {
    const key = period.toISOString();
    const existing = buckets.get(key);
    if (existing) return existing;
    const bucket = { period, failures: 0, repairHours: 0, completionTimes: [] as Date[] };
    buckets.set(key, bucket);
    return bucket;
  };

  workOrders.forEach((order) => {
    if (!order.completedAt) return;
    const period = startOfPeriod(new Date(order.completedAt), granularity);
    const bucket = ensureBucket(period);
    const repairHours =
      typeof order.laborHours === 'number'
        ? order.laborHours
        : typeof order.timeSpentMin === 'number'
        ? order.timeSpentMin / 60
        : 0;
    bucket.failures += 1;
    bucket.repairHours += repairHours;
    bucket.completionTimes.push(new Date(order.completedAt));
  });

  const series: MttrMtbfTrendPoint[] = [];
  let cursor = startOfPeriod(start, granularity);
  const endCursor = startOfPeriod(end, granularity);
  while (cursor.getTime() <= endCursor.getTime()) {
    const bucket = buckets.get(cursor.toISOString());
    if (!bucket) {
      series.push({ period: cursor.toISOString(), mttrHours: 0, mtbfHours: 0, failures: 0 });
    } else {
      const mttr = bucket.failures ? bucket.repairHours / bucket.failures : 0;
      let mtbf = 0;
      if (bucket.completionTimes.length > 1) {
        const sorted = bucket.completionTimes.sort((a, b) => a.getTime() - b.getTime());
        const deltas = sorted.slice(1).map((date, index) => hoursBetween(sorted[index], date));
        mtbf = deltas.reduce((sum, delta) => sum + delta, 0) / deltas.length;
      }
      series.push({
        period: cursor.toISOString(),
        mttrHours: Number(mttr.toFixed(2)),
        mtbfHours: Number(mtbf.toFixed(2)),
        failures: bucket.failures,
      });
    }
    cursor = nextPeriod(cursor, granularity);
  }

  return {
    range: { start: start.toISOString(), end: end.toISOString(), granularity },
    series,
  };
};

export const calculateBacklogAgingMetrics = async (
  tenantId: Types.ObjectId | string,
  window: TimeWindow,
): Promise<BacklogAgingMetrics> => {
  const now = window.end ?? new Date();
  const filter: FilterQuery<typeof WorkOrder> = {
    tenantId,
    status: { $nin: ['completed', 'cancelled'] },
    ...applyAssetFilter(window),
    ...buildDateRange('createdAt', window),
  } as FilterQuery<typeof WorkOrder>;

  const workOrders = await WorkOrder.find(filter)
    .select(['createdAt'])
    .lean()
    .exec();

  const buckets: BacklogAgingBucket[] = [
    { label: '0-7 days', minDays: 0, maxDays: 7, count: 0 },
    { label: '8-14 days', minDays: 8, maxDays: 14, count: 0 },
    { label: '15-30 days', minDays: 15, maxDays: 30, count: 0 },
    { label: '31-60 days', minDays: 31, maxDays: 60, count: 0 },
    { label: '61-90 days', minDays: 61, maxDays: 90, count: 0 },
    { label: '90+ days', minDays: 91, count: 0 },
  ];

  const ages = workOrders.map((order) => {
    const createdAt = order.createdAt ? new Date(order.createdAt) : now;
    return Math.max(0, (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
  });

  ages.forEach((age) => {
    const bucket = buckets.find((entry) =>
      typeof entry.maxDays === 'number' ? age >= entry.minDays && age <= entry.maxDays : age >= entry.minDays,
    );
    if (bucket) bucket.count += 1;
  });

  const averageAgeDays = ages.length ? ages.reduce((sum, age) => sum + age, 0) / ages.length : 0;

  return {
    asOf: now.toISOString(),
    totalOpen: workOrders.length,
    averageAgeDays: Number(averageAgeDays.toFixed(1)),
    buckets,
  };
};

const computeSlaOutcome = (workOrder: typeof WorkOrder.prototype): { responseMet: boolean; resolveMet: boolean; candidates: number } => {
  const startedAt = workOrder.requestedAt ?? workOrder.createdAt ?? workOrder.completedAt ?? null;
  const resolvedAt = workOrder.slaResolvedAt ?? workOrder.completedAt ?? null;
  const respondedAt = workOrder.slaRespondedAt ?? resolvedAt ?? workOrder.updatedAt ?? null;

  const responseDeadline = workOrder.slaResponseDueAt ?? (workOrder.slaHours
    ? startedAt && new Date(startedAt.getTime() + workOrder.slaHours * 60 * 60 * 1000)
    : workOrder.slaDueAt);
  const resolveDeadline = workOrder.slaResolveDueAt ?? workOrder.slaDueAt;

  const hasCandidate = Boolean(responseDeadline || resolveDeadline);
  if (!hasCandidate || !startedAt) return { responseMet: false, resolveMet: false, candidates: 0 };

  const responseMet = responseDeadline ? Boolean(respondedAt && respondedAt.getTime() <= responseDeadline.getTime()) : false;
  const resolveMet = resolveDeadline ? Boolean(resolvedAt && resolvedAt.getTime() <= resolveDeadline.getTime()) : false;

  return { responseMet, resolveMet, candidates: 1 };
};

export const calculateSlaPerformanceTrend = async (
  tenantId: Types.ObjectId | string,
  window: TimeWindow,
  granularity: Granularity = 'month',
): Promise<{ range: { start: string; end: string; granularity: Granularity }; series: SlaPerformancePoint[] }> => {
  const end = window.end ?? new Date();
  const start = window.start ?? startOfPeriod(new Date(end.getTime() - 1000 * 60 * 60 * 24 * 180), granularity);

  const filter: FilterQuery<typeof WorkOrder> = {
    tenantId,
    status: 'completed',
    ...applyAssetFilter(window),
    ...buildDateRange('completedAt', { start, end }),
  } as FilterQuery<typeof WorkOrder>;

  const workOrders = await WorkOrder.find(filter)
    .select([
      'completedAt',
      'requestedAt',
      'createdAt',
      'updatedAt',
      'slaHours',
      'slaDueAt',
      'slaResolveDueAt',
      'slaResponseDueAt',
      'slaResolvedAt',
      'slaRespondedAt',
    ])
    .lean()
    .exec();

  const buckets = new Map<string, { period: Date; candidates: number; responseMet: number; resolveMet: number }>();
  const ensureBucket = (period: Date) => {
    const key = period.toISOString();
    const existing = buckets.get(key);
    if (existing) return existing;
    const bucket = { period, candidates: 0, responseMet: 0, resolveMet: 0 };
    buckets.set(key, bucket);
    return bucket;
  };

  workOrders.forEach((order) => {
    if (!order.completedAt) return;
    const period = startOfPeriod(new Date(order.completedAt), granularity);
    const bucket = ensureBucket(period);
    const sla = computeSlaOutcome(order as typeof WorkOrder.prototype);
    bucket.candidates += sla.candidates;
    bucket.responseMet += sla.responseMet ? 1 : 0;
    bucket.resolveMet += sla.resolveMet ? 1 : 0;
  });

  const series: SlaPerformancePoint[] = [];
  let cursor = startOfPeriod(start, granularity);
  const endCursor = startOfPeriod(end, granularity);
  while (cursor.getTime() <= endCursor.getTime()) {
    const bucket = buckets.get(cursor.toISOString());
    if (!bucket || bucket.candidates === 0) {
      series.push({ period: cursor.toISOString(), responseRate: 0, resolutionRate: 0, candidates: 0 });
    } else {
      const responseRate = (bucket.responseMet / bucket.candidates) * 100;
      const resolutionRate = (bucket.resolveMet / bucket.candidates) * 100;
      series.push({
        period: cursor.toISOString(),
        responseRate: Number(responseRate.toFixed(1)),
        resolutionRate: Number(resolutionRate.toFixed(1)),
        candidates: bucket.candidates,
      });
    }
    cursor = nextPeriod(cursor, granularity);
  }

  return {
    range: { start: start.toISOString(), end: end.toISOString(), granularity },
    series,
  };
};

export const calculateTechnicianUtilization = async (
  tenantId: Types.ObjectId | string,
  window: TimeWindow,
): Promise<TechnicianUtilizationMetrics> => {
  const end = window.end ?? new Date();
  const start = window.start ?? new Date(end.getTime() - 1000 * 60 * 60 * 24 * 30);
  const rangeFilter = buildDateRange('completedAt', { start, end });

  const historyQuery = WorkHistory.find({ tenantId, ...rangeFilter }) as unknown as {
    select?: (fields: string[]) => unknown;
    lean?: () => unknown;
    exec?: () => Promise<unknown>;
  };
  const selected = typeof historyQuery.select === 'function'
    ? historyQuery.select(['performedBy', 'timeSpentHours'])
    : historyQuery;
  const leaned = typeof (selected as { lean?: () => unknown }).lean === 'function'
    ? (selected as { lean: () => unknown }).lean()
    : selected;
  const entriesRaw = (
    typeof (leaned as { exec?: () => Promise<unknown> }).exec === 'function'
      ? await (leaned as { exec: () => Promise<unknown> }).exec()
      : leaned
  );
  const entries = asArray<{ performedBy?: Types.ObjectId | string; timeSpentHours?: number }>(entriesRaw);

  const hoursByTech = new Map<string, number>();
  entries.forEach((entry) => {
    if (!entry.performedBy) return;
    const key = entry.performedBy.toString();
    const hours = typeof entry.timeSpentHours === 'number' ? entry.timeSpentHours : 0;
    hoursByTech.set(key, (hoursByTech.get(key) ?? 0) + hours);
  });

  if (!hoursByTech.size) {
    return {
      range: { start: start.toISOString(), end: end.toISOString() },
      averageUtilization: 0,
      technicians: [],
    };
  }

  const technicianIds = Array.from(hoursByTech.keys());
  const technicianQuery = User.find({ tenantId, _id: { $in: technicianIds } }) as unknown as {
    select?: (fields: string[]) => unknown;
    lean?: () => Promise<unknown> | unknown;
  };
  const selectedTechnicians = typeof technicianQuery.select === 'function'
    ? technicianQuery.select(['_id', 'name', 'email'])
    : technicianQuery;
  const techniciansRaw = (
    typeof (selectedTechnicians as { lean?: () => Promise<unknown> | unknown }).lean === 'function'
      ? await (selectedTechnicians as { lean: () => Promise<unknown> | unknown }).lean()
      : selectedTechnicians
  );
  const technicians = asArray<{ _id: Types.ObjectId | string; name?: string; email?: string }>(techniciansRaw);

  const nameMap = new Map(
    technicians.map((tech) => [tech._id.toString(), tech.name || tech.email || 'Technician']),
  );

  const capacityHours = daysBetween(start, end) * 8;
  const utilizationList = technicianIds.map((techId) => {
    const hoursLogged = hoursByTech.get(techId) ?? 0;
    const utilizationRate = capacityHours > 0 ? (hoursLogged / capacityHours) * 100 : 0;
    return {
      technicianId: techId,
      technicianName: nameMap.get(techId) ?? 'Technician',
      hoursLogged: Number(hoursLogged.toFixed(2)),
      capacityHours: Number(capacityHours.toFixed(2)),
      utilizationRate: Number(utilizationRate.toFixed(1)),
    };
  });

  const averageUtilization =
    utilizationList.reduce((sum, entry) => sum + entry.utilizationRate, 0) / utilizationList.length;

  return {
    range: { start: start.toISOString(), end: end.toISOString() },
    averageUtilization: Number(averageUtilization.toFixed(1)),
    technicians: utilizationList.sort((a, b) => b.utilizationRate - a.utilizationRate),
  };
};

export const calculateDowntimeCost = async (
  tenantId: Types.ObjectId | string,
  window: TimeWindow,
  hourlyRate = 0,
): Promise<DowntimeCostMetrics> => {
  const end = window.end ?? new Date();
  const start = window.start ?? new Date(end.getTime() - 1000 * 60 * 60 * 24 * 30);
  const filter: FilterQuery<typeof DowntimeLog> = {
    tenantId,
    ...applyAssetFilter(window),
    ...buildDateRange('start', { start, end }),
  } as FilterQuery<typeof DowntimeLog>;

  const events = await DowntimeLog.find(filter).sort({ start: 1 }).lean().exec();
  const totalHours = events.reduce((sum, event) => {
    const eventEnd = event.end ? new Date(event.end) : end;
    const duration = Math.max(0, (eventEnd.getTime() - new Date(event.start).getTime()) / (1000 * 60 * 60));
    return sum + duration;
  }, 0);

  const totalCost = totalHours * hourlyRate;

  return {
    range: { start: start.toISOString(), end: end.toISOString() },
    totalHours: Number(totalHours.toFixed(2)),
    hourlyRate,
    totalCost: Number(totalCost.toFixed(2)),
    currency: 'USD',
  };
};

export const calculatePmCompliance = async (
  tenantId: Types.ObjectId | string,
  window: TimeWindow,
): Promise<{ total: number; completed: number; complianceRate: number }> => {
  const baseFilter: FilterQuery<typeof WorkOrder> = {
    tenantId,
    type: 'preventive',
    ...applyAssetFilter(window),
    ...buildDateRange('createdAt', window),
  } as FilterQuery<typeof WorkOrder>;

  const [total, completed] = await Promise.all([
    WorkOrder.countDocuments(baseFilter),
    WorkOrder.countDocuments({ ...baseFilter, status: 'completed' }),
  ]);

  const complianceRate = total > 0 ? (completed / total) * 100 : 0;
  return { total, completed, complianceRate };
};
