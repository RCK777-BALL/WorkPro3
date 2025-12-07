/*
 * SPDX-License-Identifier: MIT
 */

import { Parser as Json2csvParser } from 'json2csv';
import PDFDocument from 'pdfkit';
import type { Readable } from 'stream';
import sendResponse from '../../../utils/sendResponse';
import type { AuthedRequestHandler } from '../../../types/http';
import {
  getMetricsRollupDetails,
  getMetricsRollupSummary,
  type MetricsRollupBreakdownRow,
  type MetricsRollupFilters,
} from './rollups';

const parseDate = (value: unknown): Date | undefined => {
  if (typeof value !== 'string') return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

const parseList = (value: unknown): string[] | undefined => {
  if (!value) return undefined;
  const parsed = Array.isArray(value)
    ? value.flatMap((item) => (typeof item === 'string' ? item.split(',') : [])).map((item) => item.trim())
    : typeof value === 'string'
    ? value.split(',').map((item) => item.trim())
    : [];
  return parsed.length ? parsed.filter(Boolean) : undefined;
};

const parseFilters = (query: Record<string, unknown>): MetricsRollupFilters => {
  const filters: MetricsRollupFilters = {};
  const startDate = parseDate(query.startDate);
  const endDate = parseDate(query.endDate);
  if (startDate) filters.startDate = startDate;
  if (endDate) filters.endDate = endDate;

  const siteIds = parseList(query.siteIds);
  const lineIds = parseList(query.lineIds);
  const assetIds = parseList(query.assetIds);
  if (siteIds) filters.siteIds = siteIds;
  if (lineIds) filters.lineIds = lineIds;
  if (assetIds) filters.assetIds = assetIds;

  if (query.granularity === 'month' || query.granularity === 'day') {
    filters.granularity = query.granularity;
  }

  return filters;
};

const flattenBreakdown = (rows: MetricsRollupBreakdownRow[]) =>
  rows.map((row) => ({
    scope: row.scope,
    id: row.id ?? 'all',
    name: row.name ?? 'All',
    workOrders: row.workOrders,
    completedWorkOrders: row.completedWorkOrders,
    mttrHours: row.mttrHours,
    mtbfHours: row.mtbfHours,
    pmCompleted: row.pmCompleted,
    pmTotal: row.pmTotal,
    pmCompliance: row.pmCompliance,
    downtimeMinutes: row.downtimeMinutes,
  }));

export const metricsRollupJson: AuthedRequestHandler = async (req, res, next) => {
  try {
    const filters = parseFilters(req.query);
    const summary = await getMetricsRollupSummary(req.tenantId!, filters);
    sendResponse(res, summary);
  } catch (err) {
    next(err);
  }
};

export const metricsRollupCsv: AuthedRequestHandler = async (req, res, next) => {
  try {
    const filters = parseFilters(req.query);
    const summary = await getMetricsRollupSummary(req.tenantId!, filters);
    const rows = flattenBreakdown([summary.totals, ...summary.breakdown]);
    const parser = new Json2csvParser();
    const csv = parser.parse(rows);
    res.header('Content-Type', 'text/csv');
    res.attachment('metrics-rollup.csv');
    res.send(csv);
  } catch (err) {
    next(err);
  }
};

export const metricsRollupPdf: AuthedRequestHandler = async (req, res, next) => {
  try {
    const filters = parseFilters(req.query);
    const summary = await getMetricsRollupSummary(req.tenantId!, filters);
    const doc = new PDFDocument({ autoFirstPage: true });
    const stream = doc as typeof doc & Readable;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="metrics-rollup.pdf"');
    stream.pipe(res);

    doc.fontSize(18).text('Reliability rollups', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Range: ${summary.range.start ?? 'n/a'} → ${summary.range.end ?? 'n/a'}`);
    doc.text(`Granularity: ${summary.range.granularity}`);
    doc.moveDown();

    const totals = summary.totals;
    doc.fontSize(14).text('Totals');
    doc.fontSize(12);
    doc.text(`MTTR: ${totals.mttrHours.toFixed(2)} hours`);
    doc.text(`MTBF: ${totals.mtbfHours.toFixed(2)} hours`);
    doc.text(`PM compliance: ${totals.pmCompliance.toFixed(1)}% (${totals.pmCompleted}/${totals.pmTotal})`);
    doc.text(`Downtime: ${(totals.downtimeMinutes / 60).toFixed(2)} hours`);
    doc.text(`Completed work orders: ${totals.completedWorkOrders}/${totals.workOrders}`);
    doc.moveDown();

    if (summary.breakdown.length) {
      doc.fontSize(14).text('Breakdown');
      doc.fontSize(10);
      summary.breakdown.slice(0, 15).forEach((row) => {
        doc.text(
          `${row.scope.toUpperCase()} ${row.name ?? row.id ?? 'Unassigned'} — MTTR ${row.mttrHours.toFixed(
            2,
          )}h, MTBF ${row.mtbfHours.toFixed(2)}h, PM ${row.pmCompliance.toFixed(1)}%, downtime ${(row.downtimeMinutes / 60).toFixed(
            2,
          )}h`,
        );
      });
    }

    doc.end();
  } catch (err) {
    next(err);
  }
};

export const metricsRollupDetailsJson: AuthedRequestHandler = async (req, res, next) => {
  try {
    const filters = parseFilters(req.query);
    const details = await getMetricsRollupDetails(req.tenantId!, filters);
    sendResponse(res, details);
  } catch (err) {
    next(err);
  }
};
