/*
 * SPDX-License-Identifier: MIT
 */

import PDFDocument from 'pdfkit';
import { Parser as Json2csvParser, Transform as Json2csvTransform } from 'json2csv';
import { Readable } from 'stream';
import type { Request } from 'express';
import type { Types } from 'mongoose';

import WorkOrder from '../models/WorkOrder';
import Asset from '../models/Asset';
import WorkHistory from '../models/WorkHistory';
import User from '../models/User';
import TimeSheet from '../models/TimeSheet';
import { LABOR_RATE } from '../config/env';
import { sendResponse } from '../utils/sendResponse';
import type { AuthedRequestHandler } from '../types/http';

interface AnalyticsStats {
  workOrderCompletionRate: number;
  averageResponseTime: number;
  maintenanceCompliance: number;
  assetUptime: number;
  costPerWorkOrder: number;
  laborUtilization: number;
  assetDowntime: number;
  topAssets: Array<{
    name: string;
    downtime: number;
    issues: number;
    cost: number;
  }>;
}

type TenantId = string | Types.ObjectId;

type RequestWithTenantContext = Request & {
  tenantId?: string | Types.ObjectId;
  user?: { tenantId?: string } | undefined;
};

type PdfKitDocument = InstanceType<typeof PDFDocument>;

const HOURS_PER_MONTH = 24 * 30;
const resolveTenantId = (req: RequestWithTenantContext): TenantId => {
  const headerTenant = req.headers?.['x-tenant-id'];
  const headerValue = Array.isArray(headerTenant) ? headerTenant[0] : headerTenant;
  const resolved =
    (req.tenantId as string | Types.ObjectId | undefined) ||
    (typeof req.user?.tenantId === 'string' ? req.user.tenantId : undefined) ||
    headerValue;

  if (!resolved) {
    throw new Error('Tenant context is required for reports');
  }

  return resolved;
};

const calculateStats = async (
  tenantId: TenantId,
  role?: string,
  workOrderType?: string,
): Promise<AnalyticsStats> => {
  const roleFilter = role ?? 'tech';

  const baseFilter: Record<string, unknown> = {
    tenantId,
    ...(workOrderType ? { type: workOrderType } : {}),
  };

  const totalWorkOrders = await WorkOrder.countDocuments(baseFilter);
  const completedOrders = await WorkOrder.countDocuments({
    ...baseFilter,
    status: 'completed',
  });
  const workOrderCompletionRate = totalWorkOrders
    ? (completedOrders / totalWorkOrders) * 100
    : 0;

  const complianceType = workOrderType ?? 'preventive';
  const pmBase: Record<string, unknown> = {
    tenantId,
    type: complianceType,
  };
  const pmTotal = await WorkOrder.countDocuments(pmBase);
  const pmCompleted = await WorkOrder.countDocuments({
    ...pmBase,
    status: 'completed',
  });
  const maintenanceCompliance = pmTotal ? (pmCompleted / pmTotal) * 100 : 0;

  const completed = await WorkOrder.find(
    { completedAt: { $exists: true }, ...baseFilter },
    {
      createdAt: 1,
      completedAt: 1,
    },
  );
  const responseDurations = completed
    .map((order) => {
      const createdAt = order.createdAt instanceof Date ? order.createdAt : undefined;
      const completedAt = order.completedAt instanceof Date ? order.completedAt : undefined;
      if (!createdAt || !completedAt) return undefined;
      return (completedAt.getTime() - createdAt.getTime()) / 36e5;
    })
    .filter((value): value is number => value !== undefined);

  const averageResponseTime = responseDurations.length
    ? responseDurations.reduce((sum, value) => sum + value, 0) / responseDurations.length
    : 0;

  const totalAssets = await Asset.countDocuments({ tenantId });
  const downAssets = await Asset.countDocuments({ status: { $ne: 'Active' }, tenantId });
  const assetUptime = totalAssets ? ((totalAssets - downAssets) / totalAssets) * 100 : 0;
  const assetDowntime = totalAssets ? (downAssets / totalAssets) * 100 : 0;

  const laborAgg = await WorkHistory.aggregate<{ hours?: number }>([
    { $match: { tenantId } },
    { $group: { _id: null, hours: { $sum: '$timeSpentHours' } } },
  ]);
  const totalLaborHours = laborAgg[0]?.hours ?? 0;
  const userCount = await User.countDocuments({ tenantId, roles: roleFilter });
  const availableHours = userCount * 160;
  const laborUtilization = availableHours ? (totalLaborHours / availableHours) * 100 : 0;

  const costPerWorkOrder = totalWorkOrders ? (totalLaborHours * LABOR_RATE) / totalWorkOrders : 0;

  const topAssets = await WorkHistory.aggregate<{
    name: string;
    downtime: number;
    issues: number;
    cost: number;
  }>([
    { $match: { tenantId } },
    { $group: { _id: '$asset', downtime: { $sum: '$timeSpentHours' }, issues: { $sum: 1 } } },
    { $sort: { downtime: -1 } },
    { $limit: 3 },
    { $lookup: { from: 'assets', localField: '_id', foreignField: '_id', as: 'asset' } },
    { $unwind: '$asset' },
    {
      $project: {
        _id: 0,
        name: '$asset.name',
        downtime: 1,
        issues: 1,
        cost: { $multiply: ['$downtime', LABOR_RATE] },
      },
    },
  ]);

  return {
    workOrderCompletionRate,
    averageResponseTime,
    maintenanceCompliance,
    assetUptime,
    costPerWorkOrder,
    laborUtilization,
    assetDowntime,
    topAssets,
  };
};

const getAnalyticsReport: AuthedRequestHandler = async (req, res, next) => {
  try {
    const role = typeof req.query.role === 'string' ? req.query.role : undefined;
    const tenantId = resolveTenantId(req);
    const typeFilter = typeof req.query.type === 'string' ? req.query.type : undefined;
    const stats = await calculateStats(tenantId, role, typeFilter);
    sendResponse(res, stats);
  } catch (err) {
    next(err);
  }
};

const drawTrendChart = (
  doc: PdfKitDocument,
  {
    x,
    y,
    width,
    height,
    labels,
    series,
  }: {
    x: number;
    y: number;
    width: number;
    height: number;
    labels: string[];
    series: Array<{
      label: string;
      color: string;
      values: number[];
    }>;
  },
) => {
  const values = series.flatMap((item) => item.values);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  doc.save();
  doc.strokeColor('#d4d4d8').rect(x, y, width, height).stroke();
  const steps = 4;
  for (let i = 1; i < steps; i += 1) {
    const yPos = y + (i / steps) * height;
    doc.moveTo(x, yPos).lineTo(x + width, yPos).stroke('#f1f5f9');
  }
  series.forEach((dataset, datasetIndex) => {
    if (dataset.values.length === 0) return;
    doc.save();
    doc.lineWidth(1.5).strokeColor(dataset.color);
    dataset.values.forEach((value, index) => {
      const xPos =
        labels.length <= 1
          ? x
          : x + (index / Math.max(labels.length - 1, 1)) * width;
      const normalized = (value - min) / range;
      const yPos = y + height - normalized * height;
      if (index === 0) {
        doc.moveTo(xPos, yPos);
      } else {
        doc.lineTo(xPos, yPos);
      }
    });
    doc.stroke();
    doc.restore();
    doc
      .fillColor(dataset.color)
      .rect(x + datasetIndex * 90, y - 14, 8, 8)
      .fill();
    doc
      .fillColor('#0f172a')
      .fontSize(8)
      .text(dataset.label, x + datasetIndex * 90 + 10, y - 16, { width: 80 });
  });
  doc.restore();
};

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const downloadReport: AuthedRequestHandler = async (req, res, next) => {
  try {
    const format = String(req.query.format ?? 'pdf').toLowerCase();
    const role = typeof req.query.role === 'string' ? req.query.role : undefined;
    const tenantId = resolveTenantId(req);
    const typeFilter = typeof req.query.type === 'string' ? req.query.type : undefined;
    const [stats, trends] = await Promise.all([
      calculateStats(tenantId, role, typeFilter),
      aggregateLongTermTrends(tenantId, 12),
    ]);
    const aiSummary = generateAiSummary(trends);

    if (format === 'csv') {
      const transform = new Json2csvTransform();
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=report.csv');
      Readable.from([stats]).pipe(transform).pipe(res);
      return;
    }

    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=report.pdf');
    doc.pipe(res);
    doc.fontSize(18).text('Analytics Report', { align: 'center' });
    doc.moveDown();
    Object.entries(stats).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        doc.fontSize(12).text(`${key}:`);
        value.forEach((item) => doc.fontSize(10).text(`• ${JSON.stringify(item)}`));
      } else {
        doc.fontSize(12).text(`${key}: ${value}`);
      }
    });
    doc.moveDown();
    doc.fontSize(16).text('AI Summary', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12).text(aiSummary.summary);
    if (aiSummary.highlights.length > 0) {
      doc.moveDown(0.5);
      aiSummary.highlights.forEach((highlight) => {
        doc.text(`• ${highlight}`);
      });
    }
    if (trends.length > 0) {
      doc.addPage();
      doc.fontSize(16).text('Long-term KPI Trends');
      doc.moveDown();
      const labels = trends.map((point) => point.period);
      drawTrendChart(doc, {
        x: 50,
        y: 120,
        width: 500,
        height: 220,
        labels,
        series: [
          { label: 'Downtime (hrs)', color: '#ef4444', values: trends.map((p) => p.downtimeHours) },
          { label: 'Compliance (%)', color: '#2563eb', values: trends.map((p) => p.compliance) },
          { label: 'Reliability (%)', color: '#16a34a', values: trends.map((p) => p.reliability) },
        ],
      });
      doc.moveDown(14);
      const latestCost = trends.at(-1)?.maintenanceCost ?? 0;
      doc
        .fontSize(12)
        .text(`Latest maintenance cost: ${currencyFormatter.format(latestCost)}`, { align: 'left' });
    }
    doc.end();
  } catch (err) {
    next(err);
  }
};

interface TrendDataPoint {
  period: string;
  maintenanceCost: number;
  assetDowntime: number;
}

const aggregateTrends = async (tenantId: TenantId): Promise<TrendDataPoint[]> => {
  const results = await WorkHistory.aggregate<{
    _id: string;
    maintenanceCost: number;
    assetDowntime: number;
  }>([
    { $match: { completedAt: { $exists: true }, tenantId } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$completedAt' } },
        maintenanceCost: { $sum: { $multiply: ['$timeSpentHours', LABOR_RATE] } },
        assetDowntime: { $sum: '$timeSpentHours' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return results.map((result) => ({
    period: result._id,
    maintenanceCost: result.maintenanceCost,
    assetDowntime: result.assetDowntime,
  }));
};

const getTrendData: AuthedRequestHandler = async (req, res, next) => {
  try {
    const tenantId = resolveTenantId(req);
    const data = await aggregateTrends(tenantId);
    sendResponse(res, data);
  } catch (err) {
    next(err);
  }
};

const exportTrendData: AuthedRequestHandler = async (req, res, next) => {
  try {
    const format = String(req.query.format ?? 'json').toLowerCase();
    const tenantId = resolveTenantId(req);
    const data = await aggregateTrends(tenantId);

    if (format === 'csv') {
      const parser = new Json2csvParser();
      const csv = parser.parse(data);
      res.setHeader('Content-Type', 'text/csv');
      res.attachment('trends.csv');
      sendResponse(res, csv);
      return;
    }

    sendResponse(res, data);
  } catch (err) {
    next(err);
  }
};

interface LongTermTrendPoint {
  period: string;
  downtimeHours: number;
  compliance: number;
  maintenanceCost: number;
  reliability: number;
}

const reliabilityScore = (downtimeHours: number): number => {
  const clamped = Math.min(Math.max(downtimeHours, 0), HOURS_PER_MONTH);
  const ratio = 1 - clamped / HOURS_PER_MONTH;
  return Number((ratio * 100).toFixed(1));
};

const aggregateLongTermTrends = async (
  tenantId: TenantId,
  months = 12,
): Promise<LongTermTrendPoint[]> => {
  const safeMonths = Number.isFinite(months)
    ? Math.min(Math.max(Math.trunc(months), 1), 36)
    : 12;
  const [downtime, compliance, costs, assetTrends] = await Promise.all([
    aggregateDowntime(tenantId),
    aggregatePmCompliance(tenantId),
    aggregateCosts(tenantId),
    aggregateTrends(tenantId),
  ]);
  const map = new Map<string, LongTermTrendPoint>();
  const ensureEntry = (period: string): LongTermTrendPoint => {
    const existing = map.get(period);
    if (existing) return existing;
    const entry: LongTermTrendPoint = {
      period,
      downtimeHours: 0,
      compliance: 0,
      maintenanceCost: 0,
      reliability: 100,
    };
    map.set(period, entry);
    return entry;
  };

  downtime.forEach((point) => {
    ensureEntry(point.period).downtimeHours = Number(point.downtime.toFixed(2));
  });
  compliance.forEach((point) => {
    ensureEntry(point.period).compliance = Number(point.compliance.toFixed(1));
  });
  costs.forEach((point) => {
    ensureEntry(point.period).maintenanceCost = Number(point.totalCost.toFixed(2));
  });
  assetTrends.forEach((point) => {
    const entry = ensureEntry(point.period);
    const downtimeHours = point.assetDowntime ?? entry.downtimeHours;
    entry.reliability = reliabilityScore(downtimeHours);
    if (!entry.maintenanceCost) {
      entry.maintenanceCost = Number(point.maintenanceCost.toFixed(2));
    }
    if (!entry.downtimeHours) {
      entry.downtimeHours = Number(point.assetDowntime.toFixed(2));
    }
  });

  return Array.from(map.values())
    .sort((a, b) => (a.period < b.period ? -1 : 1))
    .slice(-safeMonths);
};

interface AiSummaryPayload {
  summary: string;
  highlights: string[];
  latestPeriod: string | null;
  confidence: number;
}

const describeChange = (current: number, previous?: number, suffix = '') => {
  if (previous == null || Number.isNaN(previous)) {
    return { direction: 'flat', delta: 0, label: `at ${current.toFixed(1)}${suffix}` };
  }
  const delta = current - previous;
  if (Math.abs(delta) < 0.1) {
    return { direction: 'flat', delta: 0, label: 'holding steady' };
  }
  const direction = delta > 0 ? 'up' : 'down';
  return {
    direction,
    delta,
    label: `${direction} ${Math.abs(delta).toFixed(1)}${suffix}`,
  };
};

const generateAiSummary = (trends: LongTermTrendPoint[]): AiSummaryPayload => {
  if (trends.length === 0) {
    return {
      summary: 'Insufficient data to summarize long-term performance trends.',
      highlights: [],
      latestPeriod: null,
      confidence: 0.4,
    };
  }

  const latest = trends.at(-1)!;
  const previous = trends.length > 1 ? trends.at(-2) : undefined;
  const downtimeChange = describeChange(latest.downtimeHours, previous?.downtimeHours, 'h');
  const complianceChange = describeChange(latest.compliance, previous?.compliance, '%');
  const reliabilityChange = describeChange(latest.reliability, previous?.reliability, '%');
  const costChange = describeChange(latest.maintenanceCost, previous?.maintenanceCost, ' USD');

  const summary = `AI insight (${latest.period}): downtime averaged ${latest.downtimeHours.toFixed(
    1,
  )}h (${downtimeChange.label}), compliance reached ${latest.compliance.toFixed(
    1,
  )}% (${complianceChange.label}), reliability held at ${latest.reliability.toFixed(
    1,
  )}% (${reliabilityChange.label}), and spend was ${currencyFormatter.format(
    latest.maintenanceCost,
  )} (${costChange.label}).`;

  return {
    summary,
    highlights: [
      `Downtime ${downtimeChange.direction === 'down' ? 'improved' : downtimeChange.direction === 'up' ? 'worsened' : 'held steady'} by ${Math.abs(downtimeChange.delta).toFixed(1)}h`,
      `Compliance ${complianceChange.direction === 'up' ? 'gained' : complianceChange.direction === 'down' ? 'slipped' : 'held'} ${Math.abs(complianceChange.delta).toFixed(1)} pts`,
      `Reliability ${reliabilityChange.direction === 'up' ? 'strengthened' : reliabilityChange.direction === 'down' ? 'softened' : 'remained stable'}`,
    ],
    latestPeriod: latest.period,
    confidence: trends.length >= 6 ? 0.87 : 0.72,
  };
};

const getLongTermTrends: AuthedRequestHandler = async (req, res, next) => {
  try {
    const tenantId = resolveTenantId(req);
    const months = Number(req.query.months ?? 12);
    const data = await aggregateLongTermTrends(tenantId, months);
    sendResponse(res, data);
  } catch (err) {
    next(err);
  }
};

const getAiSummary: AuthedRequestHandler = async (req, res, next) => {
  try {
    const tenantId = resolveTenantId(req);
    const months = Number(req.query.months ?? 12);
    const trends = await aggregateLongTermTrends(tenantId, months);
    const payload = generateAiSummary(trends);
    sendResponse(res, payload);
  } catch (err) {
    next(err);
  }
};

interface CostBreakdown {
  period: string;
  laborCost: number;
  maintenanceCost: number;
  materialCost: number;
  totalCost: number;
}

const aggregateCosts = async (tenantId: TenantId): Promise<CostBreakdown[]> => {
  const labor = await TimeSheet.aggregate<{
    period: string;
    laborCost: number;
  }>([
    { $match: { tenantId } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$date' } },
        hours: { $sum: '$totalHours' },
      },
    },
    {
      $project: { _id: 0, period: '$_id', laborCost: { $multiply: ['$hours', LABOR_RATE] } },
    },
  ]);

  const maintenance = await WorkHistory.aggregate<{
    period: string;
    maintenanceCost: number;
  }>([
    { $match: { tenantId } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$completedAt' } },
        maintenanceCost: { $sum: { $multiply: ['$timeSpentHours', LABOR_RATE] } },
      },
    },
    { $project: { _id: 0, period: '$_id', maintenanceCost: 1 } },
  ]);

  const materials = await WorkHistory.aggregate<{
    period: string;
    materialCost: number;
  }>([
    { $match: { tenantId } },
    { $unwind: '$materialsUsed' },
    {
      $lookup: {
        from: 'inventories',
        localField: 'materialsUsed',
        foreignField: '_id',
        as: 'inv',
      },
    },
    { $unwind: '$inv' },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$completedAt' } },
        materialCost: { $sum: '$inv.unitCost' },
      },
    },
    { $project: { _id: 0, period: '$_id', materialCost: 1 } },
  ]);

  const map = new Map<string, CostBreakdown>();

  const upsert = (entry: Partial<CostBreakdown> & { period: string }) => {
    const existing = map.get(entry.period) ?? {
      period: entry.period,
      laborCost: 0,
      maintenanceCost: 0,
      materialCost: 0,
      totalCost: 0,
    };
    if (entry.laborCost !== undefined) existing.laborCost = entry.laborCost;
    if (entry.maintenanceCost !== undefined) existing.maintenanceCost = entry.maintenanceCost;
    if (entry.materialCost !== undefined) existing.materialCost = entry.materialCost;
    existing.totalCost =
      existing.laborCost +
      existing.maintenanceCost +
      existing.materialCost;
    map.set(entry.period, existing);
  };

  labor.forEach((item) => upsert(item));
  maintenance.forEach((item) => upsert(item));
  materials.forEach((item) => upsert(item));

  return Array.from(map.values()).sort((a, b) => a.period.localeCompare(b.period));
};

const getCostMetrics: AuthedRequestHandler = async (req, res, next) => {
  try {
    const tenantId = resolveTenantId(req);
    const data = await aggregateCosts(tenantId);
    sendResponse(res, data);
  } catch (err) {
    next(err);
  }
};

interface DowntimePoint {
  period: string;
  downtime: number;
}

const aggregateDowntime = async (tenantId: TenantId): Promise<DowntimePoint[]> => {
  const results = await WorkHistory.aggregate<{
    _id: string;
    downtime: number;
  }>([
    { $match: { tenantId } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$completedAt' } },
        downtime: { $sum: '$timeSpentHours' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return results.map((result) => ({ period: result._id, downtime: result.downtime }));
};

const getDowntimeReport: AuthedRequestHandler = async (req, res, next) => {
  try {
    const tenantId = resolveTenantId(req);
    const data = await aggregateDowntime(tenantId);
    sendResponse(res, data);
  } catch (err) {
    next(err);
  }
};

interface PmCompliancePoint {
  period: string;
  compliance: number;
}

const aggregatePmCompliance = async (tenantId: TenantId): Promise<PmCompliancePoint[]> => {
  const results = await WorkOrder.aggregate<PmCompliancePoint>([
    { $match: { tenantId, type: 'preventive' } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$scheduledDate' } },
        total: { $sum: 1 },
        completed: {
          $sum: {
            $cond: [{ $eq: ['$status', 'completed'] }, 1, 0],
          },
        },
      },
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        _id: 0,
        period: '$_id',
        compliance: {
          $cond: [
            { $eq: ['$total', 0] },
            0,
            { $multiply: [{ $divide: ['$completed', '$total'] }, 100] },
          ],
        },
      },
    },
  ]);

  return results;
};

const getPmCompliance: AuthedRequestHandler = async (req, res, next) => {
  try {
    const tenantId = resolveTenantId(req);
    const data = await aggregatePmCompliance(tenantId);
    sendResponse(res, data);
  } catch (err) {
    next(err);
  }
};

interface CostByAssetPoint {
  asset: string;
  cost: number;
}

const aggregateCostByAsset = async (tenantId: TenantId): Promise<CostByAssetPoint[]> => {
  const results = await WorkHistory.aggregate<CostByAssetPoint>([
    { $match: { tenantId } },
    {
      $group: {
        _id: '$asset',
        hours: { $sum: '$timeSpentHours' },
      },
    },
    {
      $lookup: {
        from: 'assets',
        localField: '_id',
        foreignField: '_id',
        as: 'asset',
      },
    },
    { $unwind: '$asset' },
    {
      $project: {
        _id: 0,
        asset: '$asset.name',
        cost: { $multiply: ['$hours', LABOR_RATE] },
      },
    },
    { $sort: { cost: -1 } },
  ]);

  return results;
};

const getCostByAsset: AuthedRequestHandler = async (req, res, next) => {
  try {
    const tenantId = resolveTenantId(req);
    const data = await aggregateCostByAsset(tenantId);
    sendResponse(res, data);
  } catch (err) {
    next(err);
  }
};

interface ReportSchedule {
  frequency: 'monthly';
  dayOfMonth: number;
  hourUtc: string;
  recipients: string[];
  sendEmail: boolean;
  sendDownloadLink: boolean;
  format: 'pdf' | 'csv';
  timezone: string;
  nextRun: string;
  updatedAt: string;
}

type ReportScheduleInput = Partial<Omit<ReportSchedule, 'nextRun' | 'updatedAt' | 'frequency'>>;

const scheduleStore = new Map<string, ReportSchedule>();

const computeNextRun = (dayOfMonth: number, hourUtc: string): string => {
  const [hours, minutes] = hourUtc.split(':').map((part) => Number(part));
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), dayOfMonth, hours || 0, minutes || 0));
  if (next <= now) {
    next.setUTCMonth(next.getUTCMonth() + 1);
  }
  return next.toISOString();
};

const normalizeRecipients = (recipients?: unknown): string[] => {
  if (!recipients) return [];
  if (Array.isArray(recipients)) {
    return recipients.map((item) => String(item)).map((email) => email.trim()).filter(Boolean);
  }
  if (typeof recipients === 'string') {
    return recipients
      .split(',')
      .map((email) => email.trim())
      .filter(Boolean);
  }
  return [];
};

const resolveSchedule = (tenantId: string): ReportSchedule => {
  const existing = scheduleStore.get(tenantId);
  if (existing) return existing;
  const schedule: ReportSchedule = {
    frequency: 'monthly',
    dayOfMonth: 1,
    hourUtc: '08:00',
    recipients: [],
    sendEmail: true,
    sendDownloadLink: false,
    format: 'pdf',
    timezone: 'UTC',
    nextRun: computeNextRun(1, '08:00'),
    updatedAt: new Date().toISOString(),
  };
  scheduleStore.set(tenantId, schedule);
  return schedule;
};

const getReportSchedule: AuthedRequestHandler = async (req, res, next) => {
  try {
    const tenantId = String(resolveTenantId(req));
    const schedule = resolveSchedule(tenantId);
    sendResponse(res, schedule);
  } catch (err) {
    next(err);
  }
};

const updateReportSchedule: AuthedRequestHandler = async (req, res, next) => {
  try {
    const tenantId = String(resolveTenantId(req));
    const current = resolveSchedule(tenantId);
    const payload: ReportScheduleInput = {
      dayOfMonth: typeof req.body?.dayOfMonth === 'number' ? req.body.dayOfMonth : current.dayOfMonth,
      hourUtc: typeof req.body?.hourUtc === 'string' ? req.body.hourUtc : current.hourUtc,
      recipients: normalizeRecipients(req.body?.recipients),
      sendEmail: req.body?.sendEmail ?? current.sendEmail,
      sendDownloadLink: req.body?.sendDownloadLink ?? current.sendDownloadLink,
      format: req.body?.format === 'csv' ? 'csv' : 'pdf',
      timezone: typeof req.body?.timezone === 'string' ? req.body.timezone : current.timezone,
    };

    const nextRun = computeNextRun(payload.dayOfMonth ?? current.dayOfMonth, payload.hourUtc ?? current.hourUtc);
    const updated: ReportSchedule = {
      frequency: 'monthly',
      dayOfMonth: payload.dayOfMonth ?? current.dayOfMonth,
      hourUtc: payload.hourUtc ?? current.hourUtc,
      recipients: payload.recipients ?? current.recipients,
      sendEmail: Boolean(payload.sendEmail),
      sendDownloadLink: Boolean(payload.sendDownloadLink),
      format: payload.format ?? current.format,
      timezone: payload.timezone ?? current.timezone,
      nextRun,
      updatedAt: new Date().toISOString(),
    };
    scheduleStore.set(tenantId, updated);
    sendResponse(res, updated, null, 200, 'Schedule updated');
  } catch (err) {
    next(err);
  }
};

export {
  getAnalyticsReport,
  downloadReport,
  getTrendData,
  exportTrendData,
  getCostMetrics,
  getDowntimeReport,
  getPmCompliance,
  getCostByAsset,
  getLongTermTrends,
  getAiSummary,
  getReportSchedule,
  updateReportSchedule,
};
