/*
 * SPDX-License-Identifier: MIT
 */

import type { Response, NextFunction } from 'express';
import { Parser as Json2csvParser } from 'json2csv';
import PDFDocument from 'pdfkit';
import type { Readable } from 'stream';
import { z } from 'zod';
import type { AuthedRequest } from '../../../types/http';
import { fail } from '../../lib/http';
import {
  calculateBacklogAgingMetrics,
  calculateBacklogMetrics,
  calculateMttrMtbfTrend,
  calculatePmCompliance,
  calculateReliabilityMetrics,
  calculateSlaPerformanceTrend,
  calculateTechnicianUtilization,
} from './metricsService';

const listQuerySchema = z.object({
  startDate: z.string().datetime({ offset: true }).optional(),
  endDate: z.string().datetime({ offset: true }).optional(),
  assetIds: z
    .union([
      z.string().transform((value) => value.split(',').map((entry) => entry.trim()).filter(Boolean)),
      z.array(z.string().trim().min(1)),
    ])
    .optional(),
});

const parseQuery = (req: AuthedRequest) => {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return { error: parsed.error.errors.map((issue) => issue.message).join(', ') } as const;
  }

  const window = {
    start: parsed.data.startDate ? new Date(parsed.data.startDate) : undefined,
    end: parsed.data.endDate ? new Date(parsed.data.endDate) : undefined,
    assetIds: parsed.data.assetIds,
  } as const;

  return { window } as const;
};

const parseGranularity = (value: unknown): 'day' | 'month' => (value === 'day' ? 'day' : 'month');

const ensureTenant = (req: AuthedRequest, res: Response): req is AuthedRequest & { tenantId: string } => {
  if (!req.tenantId) {
    fail(res, 'Tenant context is required', 400);
    return false;
  }
  return true;
};

export const reliabilityMetricsHandler = async (req: AuthedRequest, res: Response, next: NextFunction) => {
  const parsed = parseQuery(req);
  if ('error' in parsed) {
    fail(res, parsed.error ?? 'Invalid request', 400);
    return;
  }

  if (!ensureTenant(req, res)) return;

  try {
    const result = await calculateReliabilityMetrics(req.tenantId, parsed.window);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const backlogMetricsHandler = async (req: AuthedRequest, res: Response, next: NextFunction) => {
  const parsed = parseQuery(req);
  if ('error' in parsed) {
    fail(res, parsed.error ?? 'Invalid request', 400);
    return;
  }

  if (!ensureTenant(req, res)) return;

  try {
    const result = await calculateBacklogMetrics(req.tenantId, parsed.window);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const pmComplianceHandler = async (req: AuthedRequest, res: Response, next: NextFunction) => {
  const parsed = parseQuery(req);
  if ('error' in parsed) {
    fail(res, parsed.error ?? 'Invalid request', 400);
    return;
  }

  if (!ensureTenant(req, res)) return;

  try {
    const result = await calculatePmCompliance(req.tenantId, parsed.window);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const mttrMtbfTrendHandler = async (req: AuthedRequest, res: Response, next: NextFunction) => {
  const parsed = parseQuery(req);
  if ('error' in parsed) {
    fail(res, parsed.error ?? 'Invalid request', 400);
    return;
  }

  if (!ensureTenant(req, res)) return;

  try {
    const granularity = parseGranularity(req.query.granularity);
    const result = await calculateMttrMtbfTrend(req.tenantId, parsed.window, granularity);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const backlogAgingHandler = async (req: AuthedRequest, res: Response, next: NextFunction) => {
  const parsed = parseQuery(req);
  if ('error' in parsed) {
    fail(res, parsed.error ?? 'Invalid request', 400);
    return;
  }

  if (!ensureTenant(req, res)) return;

  try {
    const result = await calculateBacklogAgingMetrics(req.tenantId, parsed.window);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const slaPerformanceHandler = async (req: AuthedRequest, res: Response, next: NextFunction) => {
  const parsed = parseQuery(req);
  if ('error' in parsed) {
    fail(res, parsed.error ?? 'Invalid request', 400);
    return;
  }

  if (!ensureTenant(req, res)) return;

  try {
    const granularity = parseGranularity(req.query.granularity);
    const result = await calculateSlaPerformanceTrend(req.tenantId, parsed.window, granularity);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const technicianUtilizationHandler = async (req: AuthedRequest, res: Response, next: NextFunction) => {
  const parsed = parseQuery(req);
  if ('error' in parsed) {
    fail(res, parsed.error ?? 'Invalid request', 400);
    return;
  }

  if (!ensureTenant(req, res)) return;

  try {
    const result = await calculateTechnicianUtilization(req.tenantId, parsed.window);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

const csvExport = (req: AuthedRequest, res: Response, rows: Record<string, unknown>[], filename: string) => {
  const parser = new Json2csvParser();
  const csv = parser.parse(rows);
  res.header('Content-Type', 'text/csv');
  res.attachment(filename);
  res.send(csv);
};

const pdfExport = (
  res: Response,
  title: string,
  subtitle: string,
  rows: Array<[string, string]>,
  filename: string,
) => {
  const doc = new PDFDocument({ autoFirstPage: true });
  const stream = doc as typeof doc & Readable;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  stream.pipe(res);

  doc.fontSize(18).text(title, { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(subtitle);
  doc.moveDown();
  rows.forEach(([label, value]) => {
    doc.fontSize(11).text(`${label}: ${value}`);
  });
  doc.end();
};

export const mttrMtbfTrendCsvHandler = async (req: AuthedRequest, res: Response, next: NextFunction) => {
  const parsed = parseQuery(req);
  if ('error' in parsed) {
    fail(res, parsed.error ?? 'Invalid request', 400);
    return;
  }
  if (!ensureTenant(req, res)) return;

  try {
    const granularity = parseGranularity(req.query.granularity);
    const result = await calculateMttrMtbfTrend(req.tenantId, parsed.window, granularity);
    const rows = result.series.map((point) => ({
      period: point.period,
      mttrHours: point.mttrHours,
      mtbfHours: point.mtbfHours,
      failures: point.failures,
    }));
    csvExport(req, res, rows, 'kpi-mttr-mtbf.csv');
  } catch (err) {
    next(err);
  }
};

export const mttrMtbfTrendPdfHandler = async (req: AuthedRequest, res: Response, next: NextFunction) => {
  const parsed = parseQuery(req);
  if ('error' in parsed) {
    fail(res, parsed.error ?? 'Invalid request', 400);
    return;
  }
  if (!ensureTenant(req, res)) return;

  try {
    const granularity = parseGranularity(req.query.granularity);
    const result = await calculateMttrMtbfTrend(req.tenantId, parsed.window, granularity);
    const rows: Array<[string, string]> = result.series.map((point) => [
      point.period,
      `MTTR ${point.mttrHours}h | MTBF ${point.mtbfHours}h | Failures ${point.failures}`,
    ]);
    pdfExport(
      res,
      'MTTR/MTBF Trend',
      `Range: ${result.range.start} → ${result.range.end} (${result.range.granularity})`,
      rows,
      'kpi-mttr-mtbf.pdf',
    );
  } catch (err) {
    next(err);
  }
};

export const backlogAgingCsvHandler = async (req: AuthedRequest, res: Response, next: NextFunction) => {
  const parsed = parseQuery(req);
  if ('error' in parsed) {
    fail(res, parsed.error ?? 'Invalid request', 400);
    return;
  }
  if (!ensureTenant(req, res)) return;

  try {
    const result = await calculateBacklogAgingMetrics(req.tenantId, parsed.window);
    const rows = result.buckets.map((bucket) => ({
      label: bucket.label,
      minDays: bucket.minDays,
      maxDays: bucket.maxDays ?? '∞',
      count: bucket.count,
    }));
    csvExport(req, res, rows, 'kpi-backlog-aging.csv');
  } catch (err) {
    next(err);
  }
};

export const backlogAgingPdfHandler = async (req: AuthedRequest, res: Response, next: NextFunction) => {
  const parsed = parseQuery(req);
  if ('error' in parsed) {
    fail(res, parsed.error ?? 'Invalid request', 400);
    return;
  }
  if (!ensureTenant(req, res)) return;

  try {
    const result = await calculateBacklogAgingMetrics(req.tenantId, parsed.window);
    const rows: Array<[string, string]> = result.buckets.map((bucket) => [
      bucket.label,
      `${bucket.count} work orders`,
    ]);
    pdfExport(
      res,
      'Backlog Aging',
      `As of ${result.asOf} (total open: ${result.totalOpen})`,
      rows,
      'kpi-backlog-aging.pdf',
    );
  } catch (err) {
    next(err);
  }
};

export const slaPerformanceCsvHandler = async (req: AuthedRequest, res: Response, next: NextFunction) => {
  const parsed = parseQuery(req);
  if ('error' in parsed) {
    fail(res, parsed.error ?? 'Invalid request', 400);
    return;
  }
  if (!ensureTenant(req, res)) return;

  try {
    const granularity = parseGranularity(req.query.granularity);
    const result = await calculateSlaPerformanceTrend(req.tenantId, parsed.window, granularity);
    const rows = result.series.map((point) => ({
      period: point.period,
      responseRate: point.responseRate,
      resolutionRate: point.resolutionRate,
      candidates: point.candidates,
    }));
    csvExport(req, res, rows, 'kpi-sla-performance.csv');
  } catch (err) {
    next(err);
  }
};

export const slaPerformancePdfHandler = async (req: AuthedRequest, res: Response, next: NextFunction) => {
  const parsed = parseQuery(req);
  if ('error' in parsed) {
    fail(res, parsed.error ?? 'Invalid request', 400);
    return;
  }
  if (!ensureTenant(req, res)) return;

  try {
    const granularity = parseGranularity(req.query.granularity);
    const result = await calculateSlaPerformanceTrend(req.tenantId, parsed.window, granularity);
    const rows: Array<[string, string]> = result.series.map((point) => [
      point.period,
      `Response ${point.responseRate}% | Resolution ${point.resolutionRate}% | Candidates ${point.candidates}`,
    ]);
    pdfExport(
      res,
      'SLA Performance',
      `Range: ${result.range.start} → ${result.range.end} (${result.range.granularity})`,
      rows,
      'kpi-sla-performance.pdf',
    );
  } catch (err) {
    next(err);
  }
};

export const technicianUtilizationCsvHandler = async (req: AuthedRequest, res: Response, next: NextFunction) => {
  const parsed = parseQuery(req);
  if ('error' in parsed) {
    fail(res, parsed.error ?? 'Invalid request', 400);
    return;
  }
  if (!ensureTenant(req, res)) return;

  try {
    const result = await calculateTechnicianUtilization(req.tenantId, parsed.window);
    const rows = result.technicians.map((tech) => ({
      technicianId: tech.technicianId,
      technicianName: tech.technicianName,
      hoursLogged: tech.hoursLogged,
      capacityHours: tech.capacityHours,
      utilizationRate: tech.utilizationRate,
    }));
    csvExport(req, res, rows, 'kpi-technician-utilization.csv');
  } catch (err) {
    next(err);
  }
};

export const technicianUtilizationPdfHandler = async (req: AuthedRequest, res: Response, next: NextFunction) => {
  const parsed = parseQuery(req);
  if ('error' in parsed) {
    fail(res, parsed.error ?? 'Invalid request', 400);
    return;
  }
  if (!ensureTenant(req, res)) return;

  try {
    const result = await calculateTechnicianUtilization(req.tenantId, parsed.window);
    const rows: Array<[string, string]> = result.technicians.map((tech) => [
      tech.technicianName,
      `Utilization ${tech.utilizationRate}% (${tech.hoursLogged}/${tech.capacityHours}h)`,
    ]);
    pdfExport(
      res,
      'Technician Utilization',
      `Range: ${result.range.start} → ${result.range.end} (avg ${result.averageUtilization}%)`,
      rows,
      'kpi-technician-utilization.pdf',
    );
  } catch (err) {
    next(err);
  }
};
