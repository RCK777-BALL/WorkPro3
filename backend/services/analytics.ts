/*
 * SPDX-License-Identifier: MIT
 */

import { Types } from 'mongoose';
import WorkOrder, { WorkOrder as WorkOrderType } from '../models/WorkOrder';
import WorkHistory from '../models/WorkHistory';
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
    perAsset: { assetId: string; assetName?: string | undefined; totalKwh: number }[];
    perSite: { siteId: string; siteName?: string | undefined; totalKwh: number }[];
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

export interface MaintenanceMetrics {
  mttr: number;
  mtbf: number;
  backlog: number;
  pmCompliance: { total: number; completed: number; percentage: number };
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

export interface MetricWithTrend {
  value: number;
  trend: TrendPoint[];
}

export interface PmComplianceMetric {
  total: number;
  completed: number;
  percentage: number;
  trend: TrendPoint[];
}

export interface WorkOrderVolumeMetric {
  total: number;
  byStatus: { status: WorkOrderType['status']; count: number }[];
  trend: TrendPoint[];
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
  workHistory: Array<{
    asset?: ObjectIdLike | null;
    completedAt?: Date | null;
    timeSpentHours?: number | null;
  }>;
}

export interface DashboardKpiResult {
  statuses: { status: string; count: number }[];
  overdue: number;
  pmCompliance: { total: number; completed: number; percentage: number };
  downtimeHours: number;
  maintenanceCost: number;
  partsSpend: number;
  backlogAgingDays: number;
  laborUtilization: number;
  mttr: number;
  mtbf: number;
}

export interface PmOptimizationAssetInsight {
  assetId: string;
  assetName?: string | undefined;
  usage: {
    runHoursPerDay: number;
    cyclesPerDay: number;
  };
  failureProbability: number;
  compliance: {
    total: number;
    completed: number;
    overdue: number;
    percentage: number;
    impactScore: number;
  };
}

export interface PmOptimizationScenario {
  label: string;
  description: string;
  intervalDelta: number;
  failureProbability: number;
  compliancePercentage: number;
}

export interface PmOptimizationWhatIfResponse {
  updatedAt: string;
  assets: PmOptimizationAssetInsight[];
  scenarios: PmOptimizationScenario[];
}

export interface CorporateSiteSummary {
  siteId: string;
  siteName?: string | undefined;
  tenantId: string;
  totalWorkOrders: number;
  openWorkOrders: number;
  completedWorkOrders: number;
  backlog: number;
  mttrHours: number;
  mtbfHours: number;
  pmCompliance: { total: number; completed: number; percentage: number };
}

export interface CorporateOverview {
  totals: {
    totalWorkOrders: number;
    openWorkOrders: number;
    completedWorkOrders: number;
    backlog: number;
    pmCompliance: number;
    averageMttr: number;
    averageMtbf: number;
  };
  perSite: CorporateSiteSummary[];
}

const ENERGY_METRIC = 'energy_kwh';
const DEFAULT_THRESHOLDS: Thresholds = {
  availability: 0.85,
  performance: 0.9,
  quality: 0.95,
  oee: 0.8,
};

const WORK_ORDER_STATUS_ORDER: WorkOrderType['status'][] = [
  'requested',
  'assigned',
  'in_progress',
  'paused',
  'completed',
  'cancelled',
];

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const PRODUCTION_LOOKBACK_DAYS = 30;
const WORKORDER_LOOKBACK_DAYS = 180;

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

function bucketByDay(date?: Date | null): string | null {
  if (!date) return null;
  return date.toISOString().slice(0, 10);
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

function calculateHistoryReliability(
  history: AnalyticsSources['workHistory'],
): { mttrHours: number; mtbfHours: number } {
  const completed = history.filter((item) => item.completedAt);
  if (!completed.length) {
    return { mttrHours: 0, mtbfHours: 0 };
  }

  const mttrHours = (() => {
    const durations = completed
      .map((item) => item.timeSpentHours)
      .filter((value): value is number => typeof value === 'number' && value >= 0);
    if (!durations.length) return 0;
    const total = durations.reduce((sum, value) => sum + value, 0);
    return safeDivide(total, durations.length);
  })();

  const mtbfHours = (() => {
    const failures = [...completed].sort(
      (a, b) => (a.completedAt?.getTime() ?? 0) - (b.completedAt?.getTime() ?? 0),
    );
    if (failures.length < 2) return 0;
    let delta = 0;
    for (let i = 1; i < failures.length; i += 1) {
      delta += (failures[i].completedAt?.getTime() ?? 0) - (failures[i - 1].completedAt?.getTime() ?? 0);
    }
    return safeDivide(delta, failures.length - 1) / 36e5;
  })();

  return { mttrHours, mtbfHours };
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
    const assetsForSites: Array<{ _id: Types.ObjectId }> = await Asset.find({
      tenantId: tenantFilter,
      siteId: { $in: siteFilter },
    })
      .select('_id')
      .lean();
    if (assetsForSites.length) {
      assetFilter = assetsForSites.map((doc) => doc._id);
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
  if (siteFilter) workOrderQuery.siteId = { $in: siteFilter };

  const workOrders = await WorkOrder.find(workOrderQuery)
    .select('createdAt completedAt status failureCode timeSpentMin assetId')
    .lean();

  const historyQuery: Record<string, unknown> = { tenantId: tenantFilter };
  if (dateRange) historyQuery.completedAt = dateRange;
  if (assetFilter) historyQuery.asset = { $in: assetFilter };

  const workHistory = await WorkHistory.find(historyQuery)
    .select('asset completedAt timeSpentHours')
    .lean();

  const sensorQuery: Record<string, unknown> = { tenantId: tenantFilter, metric: ENERGY_METRIC };
  if (dateRange) sensorQuery.timestamp = dateRange;
  if (assetFilter) sensorQuery.asset = { $in: assetFilter };

  const sensorReadings = await SensorReading.find(sensorQuery)
    .select('asset timestamp value metric')
    .lean();

  return { workOrders, production, sensorReadings, workHistory };
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
      const name = nameLookup.get(key);
      const group: {
        id: string;
        name?: string;
        records: AnalyticsSources['production'];
      } = {
        id: key,
        records: [],
      };
      if (name !== undefined) {
        group.name = name;
      }
      groups.set(key, group);
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
      .map(([assetId, value]) => {
        const base = { assetId, totalKwh: value };
        const assetName = assetNames.get(assetId);
        return assetName !== undefined ? { ...base, assetName } : base;
      })
      .sort((a, b) => b.totalKwh - a.totalKwh),
    perSite: Array.from(perSite.entries())
      .map(([siteId, value]) => {
        const base = { siteId, totalKwh: value };
        const siteName = siteNames.get(siteId);
        return siteName !== undefined ? { ...base, siteName } : base;
      })
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

  const assetDocs: Array<{ _id: Types.ObjectId; name: string; siteId?: Types.ObjectId | null }> = assetIds.size
    ? await Asset.find({ _id: { $in: Array.from(assetIds) } })
        .select('name siteId')
        .lean()
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
    const docs: Array<{ _id: Types.ObjectId; name: string }> = await Site.find({
      _id: { $in: Array.from(siteIds) },
    })
      .select('name')
      .lean();
    docs.forEach((site) => siteNames.set(site._id.toString(), site.name));
  }

  const energy = computeEnergyStats(sources.sensorReadings, sources.production, assetNames, siteNames, assetSite, filters);

  const downtimeReasons = Array.from(downtime.reasons.entries())
    .map(([reason, minutes]) => ({ reason, minutes }))
    .sort((a, b) => b.minutes - a.minutes);

  const assetBenchmarks = buildBenchmark(sources.production, (record) => record.asset, assetNames);
  const siteBenchmarks = buildBenchmark(sources.production, (record) => record.site ?? assetSite.get(record.asset?.toString() ?? ''), siteNames);

  const reliability = calculateHistoryReliability(sources.workHistory);
  const mttr = reliability.mttrHours || calculateMTTR(sources.workOrders);
  const mtbf = reliability.mtbfHours || calculateMTBF(sources.workOrders);

  return {
    mttr,
    mtbf,
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
      ...(filters.startDate ? { start: filters.startDate.toISOString() } : {}),
      ...(filters.endDate ? { end: filters.endDate.toISOString() } : {}),
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

function createEmptyDashboardKpiResult(): DashboardKpiResult {
  return {
    statuses: WORK_ORDER_STATUS_ORDER.map((status) => ({ status, count: 0 })),
    overdue: 0,
    pmCompliance: { total: 0, completed: 0, percentage: 0 },
    downtimeHours: 0,
    maintenanceCost: 0,
    partsSpend: 0,
    backlogAgingDays: 0,
    laborUtilization: 0,
    mttr: 0,
    mtbf: 0,
  };
}

type DashboardWorkOrderFields = {
  status: WorkOrderType['status'];
  dueDate?: Date | null;
  pmTask?: Types.ObjectId | null;
  completedAt?: Date | null;
  createdAt?: Date;
  downtime?: number | null;
  partsUsed?: Array<{ cost?: number | null; qty?: number | null }>;
  siteId?: Types.ObjectId | null;
  assetId?: Types.ObjectId | null;
};

type DashboardFilterContext = {
  tenantFilter: Types.ObjectId | string;
  dateRange: ReturnType<typeof buildDateRange>;
  assetFilter?: Types.ObjectId[];
  siteFilter?: Types.ObjectId[];
  isEmpty: boolean;
};

async function buildDashboardFilterContext(
  tenantId: string,
  filters: AnalyticsFilters,
): Promise<DashboardFilterContext> {
  const tenantFilter = toObjectId(tenantId);
  const dateRange = buildDateRange(filters);
  let assetFilter = normalizeIdList(filters.assetIds) ?? [];
  const siteFilter = normalizeIdList(filters.siteIds) ?? [];

  if (siteFilter.length) {
    const assetsForSites: Array<{ _id: Types.ObjectId }> = await Asset.find({
      tenantId: tenantFilter,
      siteId: { $in: siteFilter },
    })
      .select('_id')
      .lean();
    const siteAssetIds = assetsForSites.map((doc) => doc._id);
    if (assetFilter.length) {
      const allowed = new Set(siteAssetIds.map((id) => id.toString()));
      assetFilter = assetFilter.filter((id) => allowed.has(id.toString()));
      if (!assetFilter.length) {
        return { tenantFilter, dateRange, assetFilter, siteFilter, isEmpty: true };
      }
    } else if (siteAssetIds.length) {
      assetFilter = siteAssetIds;
    }
  }

  const context: DashboardFilterContext = { tenantFilter, dateRange, isEmpty: false };
  if (assetFilter.length) context.assetFilter = assetFilter;
  if (siteFilter.length) context.siteFilter = siteFilter;

  return context;
}

async function fetchDashboardWorkOrders<
  T extends DashboardWorkOrderFields = DashboardWorkOrderFields,
>(tenantId: string, filters: AnalyticsFilters, select: string, context?: DashboardFilterContext): Promise<T[]> {
  const { tenantFilter, dateRange, assetFilter, siteFilter, isEmpty } =
    context ?? (await buildDashboardFilterContext(tenantId, filters));

  if (isEmpty) return [];

  const workOrderMatch: Record<string, unknown> = { tenantId: tenantFilter };
  if (assetFilter && assetFilter.length) {
    workOrderMatch.assetId = { $in: assetFilter };
  }
  if (siteFilter && siteFilter.length) {
    workOrderMatch.siteId = { $in: siteFilter };
  }
  if (dateRange) {
    workOrderMatch.$or = [
      { createdAt: dateRange },
      { completedAt: dateRange },
      { dueDate: dateRange },
    ];
  }

  const workOrders = await WorkOrder.find(workOrderMatch).select(select).lean<T[]>();
  return workOrders;
}

function filterOrdersByDate<T>(
  orders: T[],
  filters: AnalyticsFilters,
  selector: (order: T) => Date | null | undefined,
): T[] {
  const range = buildDateRange(filters);
  if (!range) return orders;

  return orders.filter((order) => {
    const date = selector(order);
    if (!date) return false;
    if (range.$gte && date < range.$gte) return false;
    if (range.$lte && date > range.$lte) return false;
    return true;
  });
}

export async function getDashboardKpiSummary(
  tenantId: string,
  filters: AnalyticsFilters = {},
): Promise<DashboardKpiResult> {
  const filterContext = await buildDashboardFilterContext(tenantId, filters);
  if (filterContext.isEmpty) {
    return createEmptyDashboardKpiResult();
  }

  const workOrders = await fetchDashboardWorkOrders<{
    status: WorkOrderType['status'];
    dueDate?: Date | null;
    pmTask?: Types.ObjectId | null;
    completedAt?: Date | null;
    createdAt?: Date;
    downtime?: number | null;
    partsCostTotal?: number | null;
    partsCost?: number | null;
    partsUsed?: Array<{ cost?: number | null; qty?: number | null }>;
  }>(
    tenantId,
    filters,
    'status dueDate pmTask completedAt createdAt downtime partsUsed partsCost partsCostTotal',
    filterContext,
  );

  const { tenantFilter, assetFilter, dateRange } = filterContext;

  const historyMatch: Record<string, unknown> = { tenantId: tenantFilter };
  if (assetFilter && assetFilter.length) {
    historyMatch.asset = { $in: assetFilter };
  }
  if (dateRange) {
    historyMatch.completedAt = dateRange;
  }

  const workHistory = await WorkHistory.find(historyMatch)
    .select('asset completedAt timeSpentHours')
    .lean();

  if (!workOrders.length) {
    return createEmptyDashboardKpiResult();
  }

  const statusTotals = new Map<WorkOrderType['status'], number>();
  workOrders.forEach((workOrder) => {
    statusTotals.set(workOrder.status, (statusTotals.get(workOrder.status) ?? 0) + 1);
  });

  const now = filters.endDate ?? new Date();
  const overdue = workOrders.filter((wo) => {
    if (!wo.dueDate) return false;
    const dueTime = wo.dueDate.getTime();
    return dueTime < now.getTime() && wo.status !== 'completed' && wo.status !== 'cancelled';
  }).length;

  let maintenanceCost = 0;
  let partsSpend = 0;
  let downtimeHours = 0;
  let pmTotal = 0;
  let pmCompleted = 0;
  let backlogAgeAccumulator = 0;
  let backlogCount = 0;

  const reliability = calculateHistoryReliability(workHistory);
  const mttr = reliability.mttrHours || calculateMTTR(workOrders);
  const mtbf = reliability.mtbfHours || calculateMTBF(workOrders);

  workOrders.forEach((wo) => {
    if (wo.pmTask) {
      pmTotal += 1;
      if (wo.status === 'completed') {
        pmCompleted += 1;
      }
    }
    downtimeHours += wo.downtime ?? 0;
    const partsCost =
      typeof wo.partsCostTotal === 'number'
        ? wo.partsCostTotal
        : typeof wo.partsCost === 'number'
          ? wo.partsCost
          : (wo.partsUsed ?? []).reduce((sum, part) => {
              const qty = typeof part.qty === 'number' ? part.qty : 1;
              const cost = typeof part.cost === 'number' ? part.cost : 0;
              return sum + cost * qty;
            }, 0);
    maintenanceCost += partsCost;
    partsSpend += partsCost;

    if (wo.status !== 'completed' && wo.status !== 'cancelled' && wo.createdAt) {
      const ageDays = (now.getTime() - wo.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      backlogAgeAccumulator += Math.max(0, ageDays);
      backlogCount += 1;
    }
  });

  const pmPercentage = pmTotal ? (pmCompleted / pmTotal) * 100 : 0;
  const backlogAgingDays = backlogCount ? backlogAgeAccumulator / backlogCount : 0;

  const totalLaborHours = workHistory.reduce((sum, entry) => sum + Number(entry.timeSpentHours ?? 0), 0);
  const windowDays = dateRange
    ? Math.max(1, Math.ceil(((dateRange.$lte ?? now).getTime() - (dateRange.$gte ?? now).getTime()) / (1000 * 60 * 60 * 24)))
    : 30;
  const laborCapacity = windowDays * 8;
  const laborUtilization = laborCapacity > 0 ? Math.min(100, (totalLaborHours / laborCapacity) * 100) : 0;

  return {
    statuses: WORK_ORDER_STATUS_ORDER.map((status) => ({ status, count: statusTotals.get(status) ?? 0 })),
    overdue,
    pmCompliance: { total: pmTotal, completed: pmCompleted, percentage: pmPercentage },
    downtimeHours,
    maintenanceCost,
    partsSpend,
    backlogAgingDays,
    laborUtilization,
    mttr,
    mtbf,
  };
}

export async function getMaintenanceMetrics(
  tenantId: string,
  filters: AnalyticsFilters = {},
): Promise<MaintenanceMetrics> {
  const [kpis, dashboard] = await Promise.all([
    getKPIs(tenantId, filters),
    getDashboardKpiSummary(tenantId, filters),
  ]);

  return {
    mttr: kpis.mttr,
    mtbf: kpis.mtbf,
    backlog: kpis.backlog,
    pmCompliance: dashboard.pmCompliance,
    range: kpis.range,
  };
}

function buildMtbfTrend(workOrders: Array<{ completedAt?: Date | null }>): TrendPoint[] {
  const grouped = new Map<string, typeof workOrders>();
  workOrders.forEach((order) => {
    const bucket = bucketByDay(order.completedAt ?? null);
    if (!bucket) return;
    if (!grouped.has(bucket)) {
      grouped.set(bucket, []);
    }
    grouped.get(bucket)!.push(order);
  });

  return Array.from(grouped.entries())
    .map(([period, orders]) => ({ period, value: Number(calculateMTBF(orders).toFixed(2)) }))
    .sort((a, b) => (a.period < b.period ? -1 : 1));
}

function buildPmComplianceTrend(
  workOrders: Array<{ pmTask?: Types.ObjectId | null; status: WorkOrderType['status']; completedAt?: Date | null }>,
): TrendPoint[] {
  const grouped = new Map<string, { total: number; completed: number }>();
  workOrders.forEach((order) => {
    const bucket = bucketByDay(order.completedAt ?? null);
    if (!bucket || !order.pmTask) return;
    const current = grouped.get(bucket) ?? { total: 0, completed: 0 };
    current.total += 1;
    if (order.status === 'completed') {
      current.completed += 1;
    }
    grouped.set(bucket, current);
  });

  return Array.from(grouped.entries())
    .map(([period, counts]) => ({
      period,
      value: counts.total ? Number(((counts.completed / counts.total) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => (a.period < b.period ? -1 : 1));
}

function buildWorkOrderVolumeTrend(workOrders: Array<{ createdAt?: Date }>): TrendPoint[] {
  const grouped = new Map<string, number>();
  workOrders.forEach((order) => {
    const bucket = bucketByDay(order.createdAt ?? null);
    if (!bucket) return;
    grouped.set(bucket, (grouped.get(bucket) ?? 0) + 1);
  });

  return normalizeTrend(grouped);
}

export async function getDashboardMtbf(
  tenantId: string,
  filters: AnalyticsFilters = {},
): Promise<MetricWithTrend> {
  const workOrders = await fetchDashboardWorkOrders<{ completedAt?: Date | null; status: WorkOrderType['status'] }>(
    tenantId,
    filters,
    'completedAt',
  );
  const scoped = filterOrdersByDate(workOrders, filters, (order) => order.completedAt ?? null);
  return {
    value: Number(calculateMTBF(scoped).toFixed(2)),
    trend: buildMtbfTrend(scoped),
  };
}

export async function getDashboardPmCompliance(
  tenantId: string,
  filters: AnalyticsFilters = {},
): Promise<PmComplianceMetric> {
  const workOrders = await fetchDashboardWorkOrders<{
    pmTask?: Types.ObjectId | null;
    status: WorkOrderType['status'];
    completedAt?: Date | null;
  }>(tenantId, filters, 'pmTask status completedAt');

  const scoped = filterOrdersByDate(workOrders, filters, (order) => order.completedAt ?? null);

  const pmTotal = scoped.filter((wo) => Boolean(wo.pmTask)).length;
  const pmCompleted = scoped.filter((wo) => wo.pmTask && wo.status === 'completed').length;
  const percentage = pmTotal ? (pmCompleted / pmTotal) * 100 : 0;

  return {
    total: pmTotal,
    completed: pmCompleted,
    percentage,
    trend: buildPmComplianceTrend(scoped),
  };
}

export async function getDashboardWorkOrderVolume(
  tenantId: string,
  filters: AnalyticsFilters = {},
): Promise<WorkOrderVolumeMetric> {
  const workOrders = await fetchDashboardWorkOrders<{
    status: WorkOrderType['status'];
    createdAt?: Date;
  }>(tenantId, filters, 'status createdAt');

  const scopedOrders = filterOrdersByDate(workOrders, filters, (order) => order.createdAt ?? null);

  const statusCounts = new Map<WorkOrderType['status'], number>();
  scopedOrders.forEach((order) => {
    statusCounts.set(order.status, (statusCounts.get(order.status) ?? 0) + 1);
  });

  return {
    total: scopedOrders.length,
    byStatus: WORK_ORDER_STATUS_ORDER.map((status) => ({ status, count: statusCounts.get(status) ?? 0 })),
    trend: buildWorkOrderVolumeTrend(scopedOrders),
  };
}

export async function getCorporateSiteSummaries(
  tenantId: string,
  filters: AnalyticsFilters = {},
): Promise<CorporateSiteSummary[]> {
  const tenantFilter = toObjectId(tenantId);
  const siteFilter = normalizeIdList(filters.siteIds);
  const dateRange = buildDateRange(filters);

  const siteQuery: Record<string, unknown> = { tenantId: tenantFilter };
  if (siteFilter && siteFilter.length) {
    siteQuery._id = { $in: siteFilter };
  }
  const siteDocs = await Site.find(siteQuery).select('name tenantId').lean();
  const siteNames = new Map(siteDocs.map((site) => [site._id.toString(), site.name]));

  const assetSiteQuery: Record<string, unknown> = { tenantId: tenantFilter };
  if (siteFilter && siteFilter.length) {
    assetSiteQuery.siteId = { $in: siteFilter };
  }
  const assetSites: Array<{ _id: Types.ObjectId; siteId?: Types.ObjectId | null }> = await Asset.find(assetSiteQuery)
    .select('_id siteId')
    .lean();
  const assetSiteMap = new Map(assetSites.map((asset) => [asset._id.toString(), asset.siteId?.toString()]));
  const allowedSites = siteFilter ? new Set(siteFilter.map((id) => id.toString())) : null;

  const workOrderMatch: Record<string, unknown> = { tenantId: tenantFilter };
  if (siteFilter && siteFilter.length) {
    workOrderMatch.siteId = { $in: siteFilter };
  }
  if (dateRange) {
    workOrderMatch.$or = [
      { createdAt: dateRange },
      { completedAt: dateRange },
      { dueDate: dateRange },
    ];
  }

  const workOrders: Array<{
    siteId?: Types.ObjectId | null;
    status: WorkOrderType['status'];
    completedAt?: Date | null;
    createdAt?: Date;
    pmTask?: Types.ObjectId | null;
  }> = await WorkOrder.find(workOrderMatch)
    .select('siteId status completedAt createdAt pmTask')
    .lean();

  const historyMatch: Record<string, unknown> = { tenantId: tenantFilter };
  if (dateRange) {
    historyMatch.completedAt = dateRange;
  }
  if (siteFilter && siteFilter.length && !assetSites.length) {
    historyMatch.asset = { $in: [] };
  } else if (assetSites.length) {
    historyMatch.asset = { $in: assetSites.map((asset) => asset._id) };
  }

  const workHistory = await WorkHistory.find(historyMatch)
    .select('asset completedAt timeSpentHours')
    .lean();

  const grouped = new Map<string, typeof workOrders>();
  workOrders.forEach((order) => {
    const key = order.siteId ? order.siteId.toString() : 'unassigned';
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(order);
  });

  siteDocs.forEach((site) => {
    const id = site._id.toString();
    if (!grouped.has(id)) {
      grouped.set(id, []);
    }
  });

  const historyBySite = new Map<string, typeof workHistory>();
  workHistory.forEach((entry) => {
    const assetId = entry.asset ? entry.asset.toString() : null;
    const siteId = assetId ? assetSiteMap.get(assetId) : undefined;
    const key = siteId ?? 'unassigned';
    if (allowedSites && siteId && !allowedSites.has(siteId)) return;
    if (!historyBySite.has(key)) {
      historyBySite.set(key, []);
    }
    historyBySite.get(key)!.push(entry);
  });

  const summaries: CorporateSiteSummary[] = [];
  grouped.forEach((orders, siteId) => {
    const total = orders.length;
    const completed = orders.filter((order) => order.status === 'completed').length;
    const open = orders.filter((order) => order.status !== 'completed' && order.status !== 'cancelled').length;
    const backlog = calculateBacklog(orders);
    const pmTotal = orders.filter((order) => Boolean(order.pmTask)).length;
    const pmCompleted = orders.filter((order) => order.pmTask && order.status === 'completed').length;
    const pmPercentage = pmTotal ? (pmCompleted / pmTotal) * 100 : 0;
    const reliability = calculateHistoryReliability(historyBySite.get(siteId) ?? []);
    const mttrHours = reliability.mttrHours || calculateMTTR(orders);
    const mtbfHours = reliability.mtbfHours || calculateMTBF(orders);
    summaries.push({
      siteId,
      siteName: siteNames.get(siteId) ?? (siteId === 'unassigned' ? 'Unassigned' : undefined),
      tenantId,
      totalWorkOrders: total,
      openWorkOrders: open,
      completedWorkOrders: completed,
      backlog,
      mttrHours,
      mtbfHours,
      pmCompliance: { total: pmTotal, completed: pmCompleted, percentage: pmPercentage },
    });
  });

  return summaries.sort((a, b) => {
    const nameA = a.siteName ?? a.siteId;
    const nameB = b.siteName ?? b.siteId;
    return nameA.localeCompare(nameB);
  });
}

export async function getCorporateOverview(
  tenantId: string,
  filters: AnalyticsFilters = {},
): Promise<CorporateOverview> {
  const perSite = await getCorporateSiteSummaries(tenantId, filters);
  const aggregate = perSite.reduce(
    (acc, site) => {
      acc.totalWorkOrders += site.totalWorkOrders;
      acc.openWorkOrders += site.openWorkOrders;
      acc.completedWorkOrders += site.completedWorkOrders;
      acc.backlog += site.backlog;
      acc.pmTotal += site.pmCompliance.total;
      acc.pmCompleted += site.pmCompliance.completed;
      acc.mttrSum += site.mttrHours;
      acc.mtbfSum += site.mtbfHours;
      return acc;
    },
    {
      totalWorkOrders: 0,
      openWorkOrders: 0,
      completedWorkOrders: 0,
      backlog: 0,
      pmTotal: 0,
      pmCompleted: 0,
      mttrSum: 0,
      mtbfSum: 0,
    },
  );

  const averageMttr = perSite.length ? aggregate.mttrSum / perSite.length : 0;
  const averageMtbf = perSite.length ? aggregate.mtbfSum / perSite.length : 0;
  const pmCompliance = aggregate.pmTotal
    ? (aggregate.pmCompleted / aggregate.pmTotal) * 100
    : 0;

  return {
    totals: {
      totalWorkOrders: aggregate.totalWorkOrders,
      openWorkOrders: aggregate.openWorkOrders,
      completedWorkOrders: aggregate.completedWorkOrders,
      backlog: aggregate.backlog,
      pmCompliance,
      averageMttr,
      averageMtbf,
    },
    perSite,
  };
}

function formatUsage(value: number): number {
  return Number.isFinite(value) ? Number(value.toFixed(2)) : 0;
}

function formatProbability(value: number): number {
  return Number.isFinite(value) ? Number(value.toFixed(3)) : 0;
}

export async function getPmWhatIfSimulations(tenantId: string): Promise<PmOptimizationWhatIfResponse> {
  const tenantFilter = toObjectId(tenantId);
  const now = new Date();
  const productionCutoff = new Date(now.getTime() - PRODUCTION_LOOKBACK_DAYS * DAY_IN_MS);
  const workOrderCutoff = new Date(now.getTime() - WORKORDER_LOOKBACK_DAYS * DAY_IN_MS);

  const [assetDocs, usageAgg, pmAgg] = await Promise.all([
    Asset.find({ tenantId: tenantFilter }).select('_id name').lean(),
    ProductionRecord.aggregate<{
      _id: Types.ObjectId | null;
      totalRunTimeMinutes: number;
      totalCycles: number;
    }>([
      {
        $match: {
          tenantId: tenantFilter,
          recordedAt: { $gte: productionCutoff },
          asset: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: '$asset',
          totalRunTimeMinutes: { $sum: { $ifNull: ['$runTimeMinutes', 0] } },
          totalCycles: { $sum: { $ifNull: ['$actualUnits', 0] } },
        },
      },
    ]),
    WorkOrder.aggregate<{
      _id: Types.ObjectId | null;
      preventive: number;
      completedPreventive: number;
      overdue: number;
      corrective: number;
      total: number;
    }>([
      {
        $match: {
          tenantId: tenantFilter,
          createdAt: { $gte: workOrderCutoff },
          assetId: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: '$assetId',
          preventive: { $sum: { $cond: [{ $eq: ['$type', 'preventive'] }, 1, 0] } },
          completedPreventive: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$type', 'preventive'] },
                    { $eq: ['$status', 'completed'] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          overdue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$type', 'preventive'] },
                    { $ne: ['$status', 'completed'] },
                    { $lt: ['$dueDate', now] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          corrective: { $sum: { $cond: [{ $eq: ['$type', 'corrective'] }, 1, 0] } },
          total: { $sum: 1 },
        },
      },
    ]),
  ]);

  const assetNames = new Map(assetDocs.map((asset) => [asset._id.toString(), asset.name]));

  const usageMap = new Map<string, { runHoursPerDay: number; cyclesPerDay: number }>();
  usageAgg.forEach((entry) => {
    if (!entry._id) return;
    const runHoursPerDay = formatUsage(entry.totalRunTimeMinutes / 60 / PRODUCTION_LOOKBACK_DAYS);
    const cyclesPerDay = formatUsage(entry.totalCycles / PRODUCTION_LOOKBACK_DAYS);
    usageMap.set(entry._id.toString(), { runHoursPerDay, cyclesPerDay });
  });

  type PmAggEntry = {
    preventive: number;
    completedPreventive: number;
    overdue: number;
    corrective: number;
    total: number;
  };

  const pmMap = new Map<string, PmAggEntry>();
  pmAgg.forEach((entry) => {
    if (!entry._id) return;
    pmMap.set(entry._id.toString(), {
      preventive: entry.preventive ?? 0,
      completedPreventive: entry.completedPreventive ?? 0,
      overdue: entry.overdue ?? 0,
      corrective: entry.corrective ?? 0,
      total: entry.total ?? 0,
    });
  });

  const assetIds = new Set<string>([
    ...assetNames.keys(),
    ...usageMap.keys(),
    ...pmMap.keys(),
  ]);

  const insights: PmOptimizationAssetInsight[] = Array.from(assetIds).map((assetId) => {
    const usage = usageMap.get(assetId) ?? { runHoursPerDay: 0, cyclesPerDay: 0 };
    const pmStats = pmMap.get(assetId) ?? {
      preventive: 0,
      completedPreventive: 0,
      overdue: 0,
      corrective: 0,
      total: 0,
    };
    const compliancePercentage = pmStats.preventive
      ? (pmStats.completedPreventive / pmStats.preventive) * 100
      : 0;
    const failureProbability = pmStats.total ? pmStats.corrective / pmStats.total : 0;
    const impactScore = Math.min(
      100,
      pmStats.overdue * 10 + (1 - compliancePercentage / 100) * 40 + failureProbability * 50,
    );
    return {
      assetId,
      assetName: assetNames.get(assetId),
      usage,
      failureProbability: formatProbability(failureProbability),
      compliance: {
        total: pmStats.preventive,
        completed: pmStats.completedPreventive,
        overdue: pmStats.overdue,
        percentage: formatUsage(compliancePercentage),
        impactScore: formatUsage(impactScore),
      },
    };
  });

  const rankedInsights = insights
    .sort((a, b) => b.compliance.impactScore - a.compliance.impactScore)
    .slice(0, 12);

  const averageFailure = rankedInsights.length
    ? rankedInsights.reduce((sum, insight) => sum + insight.failureProbability, 0) /
      rankedInsights.length
    : 0;
  const averageCompliance = rankedInsights.length
    ? rankedInsights.reduce((sum, insight) => sum + insight.compliance.percentage, 0) /
      rankedInsights.length
    : 0;

  const scenarios: PmOptimizationScenario[] = [
    {
      label: 'Current plan',
      description: 'Existing preventive maintenance cadence.',
      intervalDelta: 0,
      failureProbability: formatProbability(averageFailure),
      compliancePercentage: formatUsage(averageCompliance),
    },
    {
      label: 'Accelerate PM',
      description: 'Reduce PM intervals by 20% to target high-risk assets.',
      intervalDelta: -20,
      failureProbability: formatProbability(Math.max(averageFailure - 0.12, 0)),
      compliancePercentage: formatUsage(Math.min(averageCompliance + 8, 100)),
    },
    {
      label: 'Defer PM',
      description: 'Extend PM intervals by 15% and accept higher risk.',
      intervalDelta: 15,
      failureProbability: formatProbability(Math.min(averageFailure + 0.1, 1)),
      compliancePercentage: formatUsage(Math.max(averageCompliance - 6, 0)),
    },
  ];

  return {
    updatedAt: now.toISOString(),
    assets: rankedInsights,
    scenarios,
  };
}

export default {
  getKPIs,
  getTrendDatasets,
  getDashboardKpiSummary,
  getCorporateSiteSummaries,
  getCorporateOverview,
  getPmWhatIfSimulations,
};
