/*
 * SPDX-License-Identifier: MIT
 */

import { Types } from 'mongoose';
import WorkOrder from '../models/WorkOrder';
import SensorReading from '../models/SensorReading';
import ProductionRecord from '../models/ProductionRecord';
import Asset from '../models/Asset';
import Site from '../models/Site';

type ObjectIdLike = Types.ObjectId | string;

export interface AnalyticsFilters {
  startDate?: Date;
  endDate?: Date;
  assetIds?: string[];
  siteIds?: string[];
}

export interface KPIResult {
  mttr: number;
  mtbf: number;
  backlog: number;
  availability: number;
  performance: number;
  quality: number;
  oee: number;
  energy: {
    totalKwh: number;
    averagePerHour: number;
    perAsset: { assetId: string; assetName?: string; totalKwh: number }[];
    perSite: { siteId: string; siteName?: string; totalKwh: number }[];
  };
  downtime: {
    totalMinutes: number;
    reasons: { reason: string; minutes: number }[];
    trend: TrendPoint[];
  };
  benchmarks: {
    assets: BenchmarkEntry[];
    sites: BenchmarkEntry[];
  };
  thresholds: Thresholds;
  range: { start?: string; end?: string };
}

export interface TrendPoint {
  period: string;
  value: number;
}

export interface TrendResult {
  oee: TrendPoint[];
  availability: TrendPoint[];
  performance: TrendPoint[];
  quality: TrendPoint[];
  energy: TrendPoint[];
  downtime: TrendPoint[];
}

export interface BenchmarkEntry {
  id: string;
  name: string;
  availability: number;
  performance: number;
  quality: number;
  oee: number;
}

interface Thresholds {
  availability: number;
  performance: number;
  quality: number;
  oee: number;
}

interface AggregatedProduction {
  plannedTimeMinutes: number;
  runTimeMinutes: number;
  downtimeMinutes: number;
  actualUnits: number;
  goodUnits: number;
  idealTimeSeconds: number;
}

interface AnalyticsSources {
  workOrders: Array<{
    createdAt?: Date;
    completedAt?: Date | null;
    status: string;
    failureCode?: string | null;
    timeSpentMin?: number | null;
    assetId?: ObjectIdLike | null;
  }>;
  production: Array<{
    asset?: ObjectIdLike | null;
    site?: ObjectIdLike | null;
    tenantId: ObjectIdLike;
    recordedAt: Date;
    plannedUnits?: number | null;
    actualUnits?: number | null;
    goodUnits?: number | null;
    idealCycleTimeSec?: number | null;
    plannedTimeMinutes?: number | null;
    runTimeMinutes?: number | null;
    downtimeMinutes?: number | null;
    downtimeReason?: string | null;
    energyConsumedKwh?: number | null;
  }>;
  sensorReadings: Array<{
    asset?: ObjectIdLike | null;
    timestamp: Date;
    value: number;
    metric: string;
  }>;
}

const ENERGY_METRIC = 'energy_kwh';
const DEFAULT_THRESHOLDS: Thresholds = {
  availability: 0.85,
  performance: 0.9,
  quality: 0.95,
  oee: 0.8,
};

function toObjectId(id: string): Types.ObjectId | string {
  return Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : id;
}

function normalizeIdList(ids?: string[]): Types.ObjectId[] | undefined {
  if (!ids || ids.length === 0) return undefined;
  const parsed = ids
    .map((id) => (Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : null))
    .filter((id): id is Types.ObjectId => Boolean(id));
  return parsed.length ? parsed : undefined;
}

function buildDateRange(filters: AnalyticsFilters): { $gte?: Date; $lte?: Date } | undefined {
  if (!filters.startDate && !filters.endDate) return undefined;
  const range: { $gte?: Date; $lte?: Date } = {};
  if (filters.startDate) range.$gte = filters.startDate;
  if (filters.endDate) range.$lte = filters.endDate;
  return range;
}

function safeDivide(numerator: number, denominator: number): number {
  if (!denominator) return 0;
  return numerator / denominator;
}

function calculateMTTR(workOrders: { createdAt?: Date; completedAt?: Date | null }[]): number {
  const completed = workOrders.filter((w) => w.completedAt);
  if (!completed.length) return 0;
  const total = completed.reduce((sum, w) => {
    const end = w.completedAt!.getTime();
    const start = w.createdAt?.getTime() ?? end;
    return sum + Math.max(end - start, 0);
  }, 0);
  return safeDivide(total, completed.length) / 36e5;
}

function calculateMTBF(workOrders: { completedAt?: Date | null }[]): number {
  const failures = workOrders
    .filter((w) => w.completedAt)
    .sort((a, b) => (a.completedAt!.getTime() ?? 0) - (b.completedAt!.getTime() ?? 0));
  if (failures.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < failures.length; i += 1) {
    total += failures[i].completedAt!.getTime() - failures[i - 1].completedAt!.getTime();
  }
  return safeDivide(total, failures.length - 1) / 36e5;
}

function calculateBacklog(workOrders: { status: string }[]): number {
  return workOrders.filter((w) => w.status !== 'completed').length;
}

function aggregateProduction(records: AnalyticsSources['production']): AggregatedProduction {
  return records.reduce<AggregatedProduction>(
    (acc, record) => {
      const planned = record.plannedTimeMinutes ?? 0;
      const run = record.runTimeMinutes ?? 0;
      const downtime = record.downtimeMinutes ?? 0;
      const actual = record.actualUnits ?? 0;
      const good = record.goodUnits ?? actual;
      const idealCycle = record.idealCycleTimeSec ?? 0;

      acc.plannedTimeMinutes += planned;
      acc.runTimeMinutes += run;
      acc.downtimeMinutes += downtime;
      acc.actualUnits += actual;
      acc.goodUnits += good;
      acc.idealTimeSeconds += idealCycle * actual;
      return acc;
    },
    {
      plannedTimeMinutes: 0,
      runTimeMinutes: 0,
      downtimeMinutes: 0,
      actualUnits: 0,
      goodUnits: 0,
      idealTimeSeconds: 0,
    },
  );
}

function calculateDowntime(
  workOrders: AnalyticsSources['workOrders'],
): { totalMinutes: number; reasons: Map<string, number>; trend: Map<string, number> } {
  const reasons = new Map<string, number>();
  const trend = new Map<string, number>();
  let totalMinutes = 0;

  workOrders.forEach((wo) => {
    const created = wo.createdAt?.getTime();
    const completed = wo.completedAt?.getTime();
    let minutes = wo.timeSpentMin ?? 0;
    if (!minutes && created && completed && completed > created) {
      minutes = (completed - created) / 60000;
    }
    if (!minutes) return;

    totalMinutes += minutes;
    const reason = wo.failureCode ?? 'unspecified';
    reasons.set(reason, (reasons.get(reason) ?? 0) + minutes);

    const day = (wo.completedAt ?? wo.createdAt ?? new Date()).toISOString().slice(0, 10);
    trend.set(day, (trend.get(day) ?? 0) + minutes);
  });

  return { totalMinutes, reasons, trend };
}

async function loadSources(tenantId: string, filters: AnalyticsFilters): Promise<AnalyticsSources> {
  const tenantFilter = toObjectId(tenantId);
  let assetFilter = normalizeIdList(filters.assetIds);
  const siteFilter = normalizeIdList(filters.siteIds);
  const dateRange = buildDateRange(filters);

  if (!assetFilter && siteFilter && siteFilter.length) {
    const assetsForSites = await Asset.find({ tenantId: tenantFilter, siteId: { $in: siteFilter } })
      .select('_id')
      .lean();
    if (assetsForSites.length) {
      assetFilter = assetsForSites.map((doc) => doc._id as Types.ObjectId);
    }
  }

  const productionQuery: Record<string, unknown> = { tenantId: tenantFilter };
  if (dateRange) productionQuery.recordedAt = dateRange;
  if (assetFilter) productionQuery.asset = { $in: assetFilter };
  if (siteFilter) productionQuery.site = { $in: siteFilter };

  const production = await ProductionRecord.find(productionQuery).lean();

  const workOrderQuery: Record<string, unknown> = { tenantId: tenantFilter };
  if (dateRange) {
    workOrderQuery.$or = [
      { createdAt: dateRange },
      { completedAt: dateRange },
    ];
  }
  if (assetFilter) workOrderQuery.assetId = { $in: assetFilter };

  const workOrders = await WorkOrder.find(workOrderQuery)
    .select('createdAt completedAt status failureCode timeSpentMin assetId')
    .lean();

  const sensorQuery: Record<string, unknown> = { tenantId: tenantFilter, metric: ENERGY_METRIC };
  if (dateRange) sensorQuery.timestamp = dateRange;
  if (assetFilter) sensorQuery.asset = { $in: assetFilter };

  const sensorReadings = await SensorReading.find(sensorQuery)
    .select('asset timestamp value metric')
    .lean();

  return { workOrders, production, sensorReadings };
}

function buildBenchmark(
  records: AnalyticsSources['production'],
  idSelector: (record: AnalyticsSources['production'][number]) => ObjectIdLike | undefined | null,
  nameLookup: Map<string, string>,
): BenchmarkEntry[] {
  const groups = new Map<
    string,
    {
      id: string;
      name?: string;
      records: AnalyticsSources['production'];
    }
  >();

  records.forEach((record) => {
    const id = idSelector(record);
    const key = id ? id.toString() : 'unassigned';
    if (!groups.has(key)) {
      groups.set(key, { id: key, name: nameLookup.get(key), records: [] });
    }
    groups.get(key)!.records.push(record);
  });

  const entries: BenchmarkEntry[] = [];
  groups.forEach((group) => {
    const aggregated = aggregateProduction(group.records);
    const availability = aggregated.plannedTimeMinutes
      ? Math.min(
          1,
          Math.max(
            0,
            safeDivide(
              aggregated.runTimeMinutes || aggregated.plannedTimeMinutes - aggregated.downtimeMinutes,
              aggregated.plannedTimeMinutes,
            ),
          ),
        )
      : 0;
    const runTimeMinutes = aggregated.runTimeMinutes || aggregated.plannedTimeMinutes - aggregated.downtimeMinutes;
    const performance = runTimeMinutes
      ? Math.min(1, safeDivide(aggregated.idealTimeSeconds, runTimeMinutes * 60))
      : 0;
    const quality = aggregated.actualUnits ? safeDivide(aggregated.goodUnits, aggregated.actualUnits) : 0;
    const oee = availability * performance * quality;

    entries.push({
      id: group.id,
      name: group.name ?? (group.id === 'unassigned' ? 'Unassigned' : group.id),
      availability,
      performance,
      quality,
      oee,
    });
  });

  return entries.sort((a, b) => b.oee - a.oee);
}

function normalizeTrend(map: Map<string, number>): TrendPoint[] {
  return Array.from(map.entries())
    .map(([period, value]) => ({ period, value }))
    .sort((a, b) => (a.period < b.period ? -1 : 1));
}

function computeEnergyStats(
  sensorReadings: AnalyticsSources['sensorReadings'],
  production: AnalyticsSources['production'],
  assetNames: Map<string, string>,
  siteNames: Map<string, string>,
  assetSite: Map<string, string | undefined>,
  filters: AnalyticsFilters,
): KPIResult['energy'] {
  const perAsset = new Map<string, number>();
  const perSite = new Map<string, number>();
  let minTs: number | undefined;
  let maxTs: number | undefined;

  sensorReadings.forEach((reading) => {
    const assetId = reading.asset ? reading.asset.toString() : 'unassigned';
    perAsset.set(assetId, (perAsset.get(assetId) ?? 0) + reading.value);
    const ts = reading.timestamp.getTime();
    minTs = minTs ? Math.min(minTs, ts) : ts;
    maxTs = maxTs ? Math.max(maxTs, ts) : ts;
  });

  production.forEach((record) => {
    if (!record.energyConsumedKwh) return;
    const assetId = record.asset ? record.asset.toString() : 'unassigned';
    perAsset.set(assetId, (perAsset.get(assetId) ?? 0) + record.energyConsumedKwh);
  });

  perAsset.forEach((value, assetId) => {
    const siteId = assetSite.get(assetId) ?? 'unassigned';
    perSite.set(siteId ?? 'unassigned', (perSite.get(siteId ?? 'unassigned') ?? 0) + value);
  });

  const totalKwh = Array.from(perAsset.values()).reduce((sum, val) => sum + val, 0);

  const startMs = filters.startDate?.getTime() ?? minTs;
  const endMs = filters.endDate?.getTime() ?? maxTs;
  let hours = 0;
  if (startMs && endMs && endMs > startMs) {
    hours = (endMs - startMs) / 36e5;
  }
  const averagePerHour = hours ? totalKwh / hours : totalKwh;


  return {
    totalKwh,
    averagePerHour,
    perAsset: Array.from(perAsset.entries())
      .map(([assetId, value]) => ({ assetId, assetName: assetNames.get(assetId), totalKwh: value }))
      .sort((a, b) => b.totalKwh - a.totalKwh),
    perSite: Array.from(perSite.entries())
      .map(([siteId, value]) => ({ siteId, siteName: siteNames.get(siteId), totalKwh: value }))
      .sort((a, b) => b.totalKwh - a.totalKwh),
  };
}

function computeTrendFromProduction(
  records: AnalyticsSources['production'],
  downtimeTrend: Map<string, number>,
): Pick<TrendResult, 'oee' | 'availability' | 'performance' | 'quality'> {
  const grouped = new Map<string, AnalyticsSources['production']>();
  records.forEach((record) => {
    const period = record.recordedAt.toISOString().slice(0, 10);
    if (!grouped.has(period)) grouped.set(period, []);
    grouped.get(period)!.push(record);
  });

  const oee: TrendPoint[] = [];
  const availability: TrendPoint[] = [];
  const performance: TrendPoint[] = [];
  const quality: TrendPoint[] = [];

  grouped.forEach((groupRecords, period) => {
    const aggregated = aggregateProduction(groupRecords);
    const downtimeMinutes = downtimeTrend.get(period) ?? aggregated.downtimeMinutes;
    const planned = aggregated.plannedTimeMinutes;
    const runTime = aggregated.runTimeMinutes || Math.max(planned - downtimeMinutes, 0);
    const availabilityVal = planned ? Math.min(1, Math.max(0, runTime / planned)) : 0;
    const performanceVal = runTime ? Math.min(1, safeDivide(aggregated.idealTimeSeconds, runTime * 60)) : 0;
    const qualityVal = aggregated.actualUnits ? safeDivide(aggregated.goodUnits, aggregated.actualUnits) : 0;
    const oeeVal = availabilityVal * performanceVal * qualityVal;

    oee.push({ period, value: oeeVal });
    availability.push({ period, value: availabilityVal });
    performance.push({ period, value: performanceVal });
    quality.push({ period, value: qualityVal });
  });

  const sorter = (a: TrendPoint, b: TrendPoint) => (a.period < b.period ? -1 : 1);
  return {
    oee: oee.sort(sorter),
    availability: availability.sort(sorter),
    performance: performance.sort(sorter),
    quality: quality.sort(sorter),
  };
}

function computeEnergyTrend(sensorReadings: AnalyticsSources['sensorReadings']): TrendPoint[] {
  const grouped = new Map<string, number>();
  sensorReadings.forEach((reading) => {
    const period = reading.timestamp.toISOString().slice(0, 10);
    grouped.set(period, (grouped.get(period) ?? 0) + reading.value);
  });
  return normalizeTrend(grouped);
}

export async function getKPIs(tenantId: string, filters: AnalyticsFilters = {}): Promise<KPIResult> {
  const sources = await loadSources(tenantId, filters);
  const aggregated = aggregateProduction(sources.production);
  const downtime = calculateDowntime(sources.workOrders);

  const planned = aggregated.plannedTimeMinutes;
  const downtimeMinutes = downtime.totalMinutes + aggregated.downtimeMinutes;
  const runTime = aggregated.runTimeMinutes || Math.max(planned - downtimeMinutes, 0);

  const availability = planned ? Math.min(1, Math.max(0, runTime / planned)) : 0;
  const performance = runTime ? Math.min(1, safeDivide(aggregated.idealTimeSeconds, runTime * 60)) : 0;
  const quality = aggregated.actualUnits ? safeDivide(aggregated.goodUnits, aggregated.actualUnits) : 0;
  const oee = availability * performance * quality;

  const assetIds = new Set<string>();
  const siteIds = new Set<string>();
  sources.production.forEach((record) => {
    if (record.asset) assetIds.add(record.asset.toString());
    if (record.site) siteIds.add(record.site.toString());
  });
  sources.sensorReadings.forEach((reading) => {
    if (reading.asset) assetIds.add(reading.asset.toString());
  });

  const assetDocs = assetIds.size
    ? await Asset.find({ _id: { $in: Array.from(assetIds) } }).select('name siteId').lean()
    : [];
  const assetNames = new Map<string, string>();
  const assetSite = new Map<string, string | undefined>();
  assetDocs.forEach((asset) => {
    const id = asset._id.toString();
    assetNames.set(id, asset.name);
    assetSite.set(id, asset.siteId ? asset.siteId.toString() : undefined);
    if (asset.siteId) siteIds.add(asset.siteId.toString());
  });

  const siteNames = new Map<string, string>();
  if (siteIds.size) {
    const docs = await Site.find({ _id: { $in: Array.from(siteIds) } }).select('name').lean();
    docs.forEach((site) => siteNames.set(site._id.toString(), site.name));
  }

  const energy = computeEnergyStats(sources.sensorReadings, sources.production, assetNames, siteNames, assetSite, filters);

  const downtimeReasons = Array.from(downtime.reasons.entries())
    .map(([reason, minutes]) => ({ reason, minutes }))
    .sort((a, b) => b.minutes - a.minutes);

  const assetBenchmarks = buildBenchmark(sources.production, (record) => record.asset, assetNames);
  const siteBenchmarks = buildBenchmark(sources.production, (record) => record.site ?? assetSite.get(record.asset?.toString() ?? ''), siteNames);

  return {
    mttr: calculateMTTR(sources.workOrders),
    mtbf: calculateMTBF(sources.workOrders),
    backlog: calculateBacklog(sources.workOrders),
    availability,
    performance,
    quality,
    oee,
    energy,
    downtime: {
      totalMinutes: downtime.totalMinutes,
      reasons: downtimeReasons,
      trend: normalizeTrend(downtime.trend),
    },
    benchmarks: {
      assets: assetBenchmarks,
      sites: siteBenchmarks,
    },
    thresholds: DEFAULT_THRESHOLDS,
    range: {
      start: filters.startDate?.toISOString(),
      end: filters.endDate?.toISOString(),
    },
  };
}

export async function getTrendDatasets(tenantId: string, filters: AnalyticsFilters = {}): Promise<TrendResult> {
  const sources = await loadSources(tenantId, filters);
  const downtime = calculateDowntime(sources.workOrders);
  const productionTrends = computeTrendFromProduction(sources.production, downtime.trend);
  const energyTrend = computeEnergyTrend(sources.sensorReadings);

  return {
    ...productionTrends,
    energy: energyTrend,
    downtime: normalizeTrend(downtime.trend),
  };
}

export default {
  getKPIs,
  getTrendDatasets,
};
