/*
 * SPDX-License-Identifier: MIT
 */

import PDFDocument from 'pdfkit';
import { Types } from 'mongoose';
import cron from 'node-cron';

import WorkHistory from '../../../models/WorkHistory';
import WorkOrder from '../../../models/WorkOrder';
import TimeSheet from '../../../models/TimeSheet';
import ExecutiveReportSchedule, {
  type ExecutiveReportScheduleDoc,
} from '../../../models/ExecutiveReportSchedule';
import { LABOR_RATE } from '../../../config/env';

const HOURS_PER_MONTH = 24 * 30;
export const DEFAULT_EXECUTIVE_CRON = '0 9 1 * *';
const DEFAULT_TIMEZONE = 'UTC';
const MIN_MONTHS = 3;
const MAX_MONTHS = 36;

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

export type TenantId = string | Types.ObjectId;

export interface ExecutiveTrendPoint {
  period: string;
  downtimeHours: number;
  compliance: number;
  maintenanceCost: number;
  reliability: number;
}

export interface ExecutiveNarrative {
  summary: string;
  highlights: string[];
  latestPeriod: string | null;
  confidence: number;
}

export interface ExecutiveKpiSummary {
  points: ExecutiveTrendPoint[];
  averages: {
    downtimeHours: number;
    compliance: number;
    maintenanceCost: number;
    reliability: number;
  };
  months: number;
  narrative: ExecutiveNarrative;
}

export interface ExecutiveReportArtifact {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  narrative: ExecutiveNarrative;
  points: ExecutiveTrendPoint[];
  generatedAt: Date;
}

export interface ExecutiveScheduleSettings {
  enabled: boolean;
  cron: string;
  timezone: string;
  recipients: string[];
  lastRunAt?: Date | null;
  lastRunStatus?: ExecutiveReportScheduleDoc['lastRunStatus'];
  lastRunError?: string;
}

export interface UpdateExecutiveScheduleInput {
  enabled?: boolean | undefined;
  cron?: string | undefined;
  timezone?: string | undefined;
  recipients?: string[] | undefined;
}

export class ExecutiveScheduleError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'ExecutiveScheduleError';
    this.status = status;
  }
}

interface DowntimePoint {
  period: string;
  downtime: number;
}

interface CompliancePoint {
  period: string;
  compliance: number;
}

interface CostPoint {
  period: string;
  totalCost: number;
}

const toObjectId = (tenantId: TenantId): Types.ObjectId => {
  if (tenantId instanceof Types.ObjectId) {
    return tenantId;
  }
  if (!Types.ObjectId.isValid(tenantId)) {
    throw new ExecutiveScheduleError('Tenant context is invalid');
  }
  return new Types.ObjectId(tenantId);
};

const clampMonths = (value: number | undefined): number => {
  if (!Number.isFinite(value)) {
    return 12;
  }
  const normalized = Math.trunc(value as number);
  return Math.min(Math.max(normalized, MIN_MONTHS), MAX_MONTHS);
};

const reliabilityScore = (downtimeHours: number): number => {
  const clamped = Math.min(Math.max(downtimeHours, 0), HOURS_PER_MONTH);
  const ratio = 1 - clamped / HOURS_PER_MONTH;
  return Number((ratio * 100).toFixed(1));
};

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

const aggregatePmCompliance = async (tenantId: TenantId): Promise<CompliancePoint[]> => {
  const results = await WorkOrder.aggregate<{
    period: string;
    compliance: number;
  }>([
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

const aggregateCosts = async (tenantId: TenantId): Promise<CostPoint[]> => {
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

  const map = new Map<
    string,
    { period: string; laborCost: number; maintenanceCost: number; materialCost: number }
  >();

  const upsert = (period: string) => {
    const existing = map.get(period);
    if (existing) return existing;
    const entry = { period, laborCost: 0, maintenanceCost: 0, materialCost: 0 };
    map.set(period, entry);
    return entry;
  };

  labor.forEach((item) => {
    const entry = upsert(item.period);
    entry.laborCost += item.laborCost;
  });
  maintenance.forEach((item) => {
    const entry = upsert(item.period);
    entry.maintenanceCost += item.maintenanceCost;
  });
  materials.forEach((item) => {
    const entry = upsert(item.period);
    entry.materialCost += item.materialCost;
  });

  return Array.from(map.values())
    .map((entry) => ({
      period: entry.period,
      totalCost: entry.laborCost + entry.maintenanceCost + entry.materialCost,
    }))
    .sort((a, b) => a.period.localeCompare(b.period));
};

const describeChange = (current: number, previous?: number, suffix = '') => {
  if (previous == null || Number.isNaN(previous)) {
    return { direction: 'flat', delta: 0, label: `at ${current.toFixed(1)}${suffix}` };
  }
  const delta = current - previous;
  if (Math.abs(delta) < 0.1) {
    return { direction: 'flat', delta: 0, label: 'holding steady' };
  }
  const direction = delta > 0 ? 'up' : 'down';
  return { direction, delta, label: `${direction} ${Math.abs(delta).toFixed(1)}${suffix}` };
};

const generateNarrative = (points: ExecutiveTrendPoint[]): ExecutiveNarrative => {
  if (!points.length) {
    return {
      summary: 'Insufficient data to summarize executive trends.',
      highlights: [],
      latestPeriod: null,
      confidence: 0.4,
    };
  }
  const latest = points.at(-1)!;
  const previous = points.length > 1 ? points.at(-2) : undefined;

  const downtimeChange = describeChange(latest.downtimeHours, previous?.downtimeHours, 'h');
  const complianceChange = describeChange(latest.compliance, previous?.compliance, '%');
  const reliabilityChange = describeChange(latest.reliability, previous?.reliability, '%');
  const costChange = describeChange(latest.maintenanceCost, previous?.maintenanceCost, ' USD');

  const summary = `Executive overview (${latest.period}): downtime averaged ${latest.downtimeHours.toFixed(
    1,
  )}h (${downtimeChange.label}), compliance reached ${latest.compliance.toFixed(
    1,
  )}% (${complianceChange.label}), reliability held ${reliabilityChange.label}, and spend was ${currencyFormatter.format(
    latest.maintenanceCost,
  )} (${costChange.label}).`;

  return {
    summary,
    highlights: [
      `Downtime ${
        downtimeChange.direction === 'down'
          ? 'improved'
          : downtimeChange.direction === 'up'
          ? 'worsened'
          : 'held steady'
      } by ${Math.abs(downtimeChange.delta).toFixed(1)}h`,
      `Compliance ${
        complianceChange.direction === 'up'
          ? 'gained'
          : complianceChange.direction === 'down'
          ? 'slipped'
          : 'held'
      } ${Math.abs(complianceChange.delta).toFixed(1)} pts`,
      `Reliability ${
        reliabilityChange.direction === 'up'
          ? 'strengthened'
          : reliabilityChange.direction === 'down'
          ? 'softened'
          : 'remained stable'
      }`,
    ],
    latestPeriod: latest.period,
    confidence: points.length >= 6 ? 0.87 : 0.72,
  };
};

const mapScheduleDoc = (doc: ExecutiveReportScheduleDoc | null): ExecutiveScheduleSettings => {
  if (!doc) {
    return {
      enabled: true,
      cron: DEFAULT_EXECUTIVE_CRON,
      timezone: DEFAULT_TIMEZONE,
      recipients: [],
      lastRunAt: null,
    };
  }

  const base: ExecutiveScheduleSettings = {
    enabled: doc.enabled,
    cron: doc.cron,
    timezone: doc.timezone,
    recipients: doc.recipients,
    lastRunAt: doc.lastRunAt ?? null,
    lastRunStatus: doc.lastRunStatus,
  };

  // only include lastRunError when it is a real string value to satisfy exactOptionalPropertyTypes
  if (doc.lastRunError !== undefined && doc.lastRunError !== null) {
    return { ...base, lastRunError: doc.lastRunError };
  }

  return base;
};

export async function getExecutiveKpiTrends(
  tenantId: TenantId,
  months?: number,
): Promise<ExecutiveKpiSummary> {
  const safeMonths = clampMonths(months);
  const [downtime, compliance, costs] = await Promise.all([
    aggregateDowntime(tenantId),
    aggregatePmCompliance(tenantId),
    aggregateCosts(tenantId),
  ]);

  const map = new Map<string, ExecutiveTrendPoint>();
  const ensureEntry = (period: string): ExecutiveTrendPoint => {
    const existing = map.get(period);
    if (existing) return existing;
    const entry: ExecutiveTrendPoint = {
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
    const entry = ensureEntry(point.period);
    entry.downtimeHours = Number(point.downtime.toFixed(2));
    entry.reliability = reliabilityScore(entry.downtimeHours);
  });

  compliance.forEach((point) => {
    const entry = ensureEntry(point.period);
    entry.compliance = Number(point.compliance.toFixed(1));
  });

  costs.forEach((point) => {
    const entry = ensureEntry(point.period);
    entry.maintenanceCost = Number(point.totalCost.toFixed(2));
  });

  const points = Array.from(map.values())
    .sort((a, b) => (a.period < b.period ? -1 : 1))
    .slice(-safeMonths);

  const totals = points.reduce(
    (acc, point) => {
      acc.downtimeHours += point.downtimeHours;
      acc.compliance += point.compliance;
      acc.maintenanceCost += point.maintenanceCost;
      acc.reliability += point.reliability;
      return acc;
    },
    { downtimeHours: 0, compliance: 0, maintenanceCost: 0, reliability: 0 },
  );

  const divisor = points.length || 1;

  const averages = {
    downtimeHours: Number((totals.downtimeHours / divisor).toFixed(2)),
    compliance: Number((totals.compliance / divisor).toFixed(1)),
    maintenanceCost: Number((totals.maintenanceCost / divisor).toFixed(2)),
    reliability: Number((totals.reliability / divisor).toFixed(1)),
  };

  const narrative = generateNarrative(points);

  return { points, averages, months: points.length, narrative };
}

export async function renderExecutiveReportPdf(
  tenantId: TenantId,
  months?: number,
): Promise<ExecutiveReportArtifact> {
  const kpis = await getExecutiveKpiTrends(tenantId, months);
  const generatedAt = new Date();
  const filename = `executive-report-${generatedAt.toISOString().slice(0, 10)}.pdf`;
  const doc = new PDFDocument({ margin: 40, size: 'LETTER' });
  const chunks: Buffer[] = [];

  return new Promise<ExecutiveReportArtifact>((resolve, reject) => {
    doc.on('data', (chunk) => chunks.push(chunk as Buffer));
    doc.on('error', reject);
    doc.on('end', () => {
      resolve({
        buffer: Buffer.concat(chunks),
        filename,
        mimeType: 'application/pdf',
        narrative: kpis.narrative,
        points: kpis.points,
        generatedAt,
      });
    });

    doc.fontSize(20).text('Executive Performance Report', { align: 'center' });
    doc.moveDown();
    const dateRange =
      kpis.points.length >= 2
        ? `${kpis.points[0].period} – ${kpis.points.at(-1)!.period}`
        : kpis.points[0]?.period ?? 'n/a';
    doc.fontSize(12).text(`Reporting window: ${dateRange}`);
    doc.text(`Generated on: ${generatedAt.toUTCString()}`);
    doc.moveDown();

    doc.fontSize(13).text('Narrative summary', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12).text(kpis.narrative.summary, { lineGap: 4 });
    if (kpis.narrative.highlights.length) {
      doc.moveDown();
      doc.font('Helvetica-Bold').text('Highlights:');
      doc.font('Helvetica');
      kpis.narrative.highlights.forEach((highlight) => {
        doc.text(`• ${highlight}`);
      });
    }

    doc.moveDown();
    doc.font('Helvetica-Bold').text('Averages');
    doc.font('Helvetica');
    doc.text(`Downtime: ${kpis.averages.downtimeHours.toFixed(1)} hours`);
    doc.text(`Compliance: ${kpis.averages.compliance.toFixed(1)} %`);
    doc.text(`Reliability: ${kpis.averages.reliability.toFixed(1)} %`);
    doc.text(`Maintenance cost: ${currencyFormatter.format(kpis.averages.maintenanceCost)}`);

    doc.moveDown();
    doc.font('Helvetica-Bold').text('Monthly trend table');
    doc.moveDown(0.5);
    if (!kpis.points.length) {
      doc.font('Helvetica').text('No KPI observations available for the selected period.');
    } else {
      const colWidths = [90, 110, 110, 110, 120];
      const headers = ['Period', 'Downtime (h)', 'Compliance %', 'Reliability %', 'Spend'];
      const renderRow = (values: string[], bold = false) => {
        doc.font(bold ? 'Helvetica-Bold' : 'Helvetica');
        values.forEach((value, index) => {
          const width = colWidths[index] ?? 100;
          doc.text(value, { continued: index < values.length - 1, width });
        });
        doc.text('');
      };
      renderRow(headers, true);
      kpis.points.forEach((point) => {
        renderRow([
          point.period,
          point.downtimeHours.toFixed(1),
          point.compliance.toFixed(1),
          point.reliability.toFixed(1),
          currencyFormatter.format(point.maintenanceCost),
        ]);
      });
    }

    doc.end();
  });
}

export async function getExecutiveReportSchedule(
  tenantId: TenantId,
): Promise<ExecutiveScheduleSettings> {
  const doc = await ExecutiveReportSchedule.findOne({ tenantId: toObjectId(tenantId) })
    .lean<ExecutiveReportScheduleDoc | null>();
  return mapScheduleDoc(doc);
}

const sanitizeRecipients = (recipients?: string[]): string[] => {
  if (!recipients || recipients.length === 0) {
    return [];
  }
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const normalized = recipients
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
    .filter((value, index, self) => self.indexOf(value) === index);

  normalized.forEach((recipient) => {
    if (!EMAIL_REGEX.test(recipient)) {
      throw new ExecutiveScheduleError(`Invalid recipient: ${recipient}`);
    }
  });

  return normalized;
};

export async function saveExecutiveReportSchedule(
  tenantId: TenantId,
  input: UpdateExecutiveScheduleInput,
): Promise<ExecutiveScheduleSettings> {
  const tenantObjectId = toObjectId(tenantId);
  const existing = await ExecutiveReportSchedule.findOne({ tenantId: tenantObjectId })
    .lean<ExecutiveReportScheduleDoc | null>();

  const cronExpr = input.cron?.trim() || existing?.cron || DEFAULT_EXECUTIVE_CRON;
  if (!cron.validate(cronExpr)) {
    throw new ExecutiveScheduleError('Invalid CRON expression supplied.');
  }

  const timezone = input.timezone?.trim() || existing?.timezone || DEFAULT_TIMEZONE;
  const recipients =
    input.recipients !== undefined
      ? sanitizeRecipients(input.recipients)
      : existing?.recipients ?? [];
  const enabled = input.enabled ?? existing?.enabled ?? true;

  const doc = await ExecutiveReportSchedule.findOneAndUpdate(
    { tenantId: tenantObjectId },
    {
      $set: {
        cron: cronExpr,
        timezone,
        recipients,
        enabled,
      },
      $setOnInsert: { tenantId: tenantObjectId },
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
  );

  return mapScheduleDoc(doc);
}
