/*
 * SPDX-License-Identifier: MIT
 */

import { Request, Response, NextFunction } from 'express';
import { Parser as Json2csvParser } from 'json2csv';
import PDFDocument from 'pdfkit';
import type { Readable } from 'stream';
import {
  getKPIs,
  getTrendDatasets,
  getDashboardKpiSummary,
  getCorporateSiteSummaries,
  getCorporateOverview,
  getPmWhatIfSimulations,
  type AnalyticsFilters,
  type KPIResult,
  type TrendResult,
  type DashboardKpiResult,
  type PmOptimizationWhatIfResponse,
} from '../services/analytics';
import { escapeXml } from '../utils/escapeXml';
import { sendResponse } from '../utils/sendResponse';

function parseList(param: unknown): string[] | undefined {
  if (!param) return undefined;

  const collectFromArray = (values: unknown[]): string[] =>
    values
      .flatMap((value) => (typeof value === 'string' ? value.split(',') : []))
      .map((value) => value.trim())
      .filter(Boolean);

  const parsed = Array.isArray(param)
    ? collectFromArray(param)
    : typeof param === 'string'
    ? param.split(',').map((value) => value.trim()).filter(Boolean)
    : [];

  return parsed.length ? parsed : undefined;
}

function parseFilters(req: Request): AnalyticsFilters {
  const filters: AnalyticsFilters = {};
  if (typeof req.query.startDate === 'string') {
    const start = new Date(req.query.startDate);
    if (!Number.isNaN(start.getTime())) filters.startDate = start;
  }
  if (typeof req.query.endDate === 'string') {
    const end = new Date(req.query.endDate);
    if (!Number.isNaN(end.getTime())) filters.endDate = end;
  }
  const assetIds = parseList(req.query.assetIds);
  if (assetIds) filters.assetIds = assetIds;
  const siteIds = parseList(req.query.siteIds);
  if (siteIds) filters.siteIds = siteIds;
  return filters;
}

function flattenKpiForExport(data: KPIResult) {
  return {
    mttr: data.mttr,
    mtbf: data.mtbf,
    backlog: data.backlog,
    availability: data.availability,
    performance: data.performance,
    quality: data.quality,
    oee: data.oee,
    energyTotalKwh: data.energy.totalKwh,
    energyAveragePerHour: data.energy.averagePerHour,
    energyPerAsset: JSON.stringify(data.energy.perAsset),
    energyPerSite: JSON.stringify(data.energy.perSite),
    downtimeTotalMinutes: data.downtime.totalMinutes,
    downtimeReasons: JSON.stringify(data.downtime.reasons),
    benchmarksAssets: JSON.stringify(data.benchmarks.assets),
    benchmarksSites: JSON.stringify(data.benchmarks.sites),
    rangeStart: data.range.start ?? null,
    rangeEnd: data.range.end ?? null,
  };
}

function flattenDashboardKpiForExport(data: DashboardKpiResult) {
  const statusEntries = data.statuses.reduce<Record<string, number>>((acc, entry) => {
    acc[`status_${entry.status}`] = entry.count;
    return acc;
  }, {});
  return {
    ...statusEntries,
    overdue: data.overdue,
    pmCompliancePercentage: data.pmCompliance.percentage,
    pmComplianceCompleted: data.pmCompliance.completed,
    pmComplianceTotal: data.pmCompliance.total,
    downtimeHours: data.downtimeHours,
    maintenanceCost: data.maintenanceCost,
    mttr: data.mttr,
    mtbf: data.mtbf,
  };
}

function mergeTrendResult(data: TrendResult): Array<Record<string, number | string>> {
  const map = new Map<string, Record<string, number | string>>();
  const assign = (key: string, points: { period: string; value: number }[]) => {
    points.forEach((point) => {
      const entry = map.get(point.period) ?? { period: point.period };
      entry[key] = point.value;
      map.set(point.period, entry);
    });
  };
  assign('oee', data.oee);
  assign('availability', data.availability);
  assign('performance', data.performance);
  assign('quality', data.quality);
  assign('energy', data.energy);
  assign('downtime', data.downtime);
  return Array.from(map.values()).sort((a, b) => (a.period < b.period ? -1 : 1));
}

type PdfDocumentOptions = ConstructorParameters<typeof PDFDocument>[0];
type StreamablePdfDocument = InstanceType<typeof PDFDocument> & Readable;

function createPdfDocument(options?: PdfDocumentOptions): StreamablePdfDocument {
  return new PDFDocument(options) as StreamablePdfDocument;
}

export const kpiJson = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const filters = parseFilters(req);
    const data = await getKPIs(req.tenantId!, filters);

    sendResponse(res, data);
  } catch (err) {
    next(err);
  }
};

export const kpiCsv = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const filters = parseFilters(req);
    const data = await getKPIs(req.tenantId!, filters);

    const parser = new Json2csvParser();
    const csv = parser.parse([flattenKpiForExport(data)]);
    res.header('Content-Type', 'text/csv');
    res.attachment('kpis.csv');
    res.send(csv);
  } catch (err) {
    next(err);
  }
};

export const kpiXlsx = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const filters = parseFilters(req);
    const data = await getKPIs(req.tenantId!, filters);
    const flat = flattenKpiForExport(data);
    const rows = Object.entries(flat)

      .map(
        ([k, v]) =>
          `<Row><Cell><Data ss:Type="String">${escapeXml(k)}</Data></Cell><Cell><Data ss:Type="String">${escapeXml(String(v))}</Data></Cell></Row>`,
      )
      .join('');
    const xml = `<?xml version="1.0"?>\n<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="KPIs"><Table><Row><Cell><Data ss:Type="String">Metric</Data></Cell><Cell><Data ss:Type="String">Value</Data></Cell></Row>${rows}</Table></Worksheet></Workbook>`;
    res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.attachment('kpis.xlsx');
    res.send(xml);
  } catch (err) {
    next(err);
  }
};

export const kpiPdf = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const filters = parseFilters(req);
    const data = await getKPIs(req.tenantId!, filters);
    const doc = createPdfDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=kpis.pdf');
    doc.pipe(res);
    doc.fontSize(18).text('Analytics KPIs', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`MTTR: ${data.mttr.toFixed(2)} h`);
    doc.text(`MTBF: ${data.mtbf.toFixed(2)} h`);
    doc.text(`Backlog: ${data.backlog}`);
    doc.moveDown();
    doc.text(`Availability: ${(data.availability * 100).toFixed(1)} %`);
    doc.text(`Performance: ${(data.performance * 100).toFixed(1)} %`);
    doc.text(`Quality: ${(data.quality * 100).toFixed(1)} %`);
    doc.text(`OEE: ${(data.oee * 100).toFixed(1)} %`);
    doc.moveDown();
    doc.text(`Energy (kWh): ${data.energy.totalKwh.toFixed(2)}`);
    doc.text(`Energy avg (kWh/h): ${data.energy.averagePerHour.toFixed(2)}`);
    doc.moveDown();
    doc.text('Downtime reasons:');
    data.downtime.reasons.slice(0, 10).forEach((item) => {
      doc.text(` • ${item.reason}: ${item.minutes.toFixed(1)} min`);
    });
    doc.end();
  } catch (err) {
    next(err);
  }
};

export const dashboardKpiJson = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const filters = parseFilters(req);
    const data = await getDashboardKpiSummary(req.tenantId!, filters);
    sendResponse(res, data);
  } catch (err) {
    next(err);
  }
};

export const corporateSitesJson = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const filters = parseFilters(req);
    const data = await getCorporateSiteSummaries(req.tenantId!, filters);
    sendResponse(res, data);
  } catch (err) {
    next(err);
  }
};

export const corporateOverviewJson = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const filters = parseFilters(req);
    const data = await getCorporateOverview(req.tenantId!, filters);
    sendResponse(res, data);
  } catch (err) {
    next(err);
  }
};

export const dashboardKpiCsv = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const filters = parseFilters(req);
    const data = await getDashboardKpiSummary(req.tenantId!, filters);
    const parser = new Json2csvParser();
    const csv = parser.parse([flattenDashboardKpiForExport(data)]);
    res.header('Content-Type', 'text/csv');
    res.attachment('dashboard-kpis.csv');
    res.send(csv);
  } catch (err) {
    next(err);
  }
};

export const dashboardKpiXlsx = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const filters = parseFilters(req);
    const data = await getDashboardKpiSummary(req.tenantId!, filters);
    const flat = flattenDashboardKpiForExport(data);
    const rows = Object.entries(flat)
      .map(
        ([k, v]) =>
          `<Row><Cell><Data ss:Type="String">${escapeXml(k)}</Data></Cell><Cell><Data ss:Type="String">${escapeXml(String(v))}</Data></Cell></Row>`,
      )
      .join('');
    const xml = `<?xml version="1.0"?>\n<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Dashboard KPIs"><Table><Row><Cell><Data ss:Type="String">Metric</Data></Cell><Cell><Data ss:Type="String">Value</Data></Cell></Row>${rows}</Table></Worksheet></Workbook>`;
    res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.attachment('dashboard-kpis.xlsx');
    res.send(xml);
  } catch (err) {
    next(err);
  }
};

export const dashboardKpiPdf = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const filters = parseFilters(req);
    const data = await getDashboardKpiSummary(req.tenantId!, filters);
    const doc = createPdfDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=dashboard-kpis.pdf');
    doc.pipe(res);
    doc.fontSize(18).text('Maintenance Dashboard KPIs', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Overdue work orders: ${data.overdue}`);
    doc.text(
      `PM compliance: ${data.pmCompliance.completed}/${data.pmCompliance.total} (${data.pmCompliance.percentage.toFixed(1)}%)`,
    );
    doc.text(`Downtime hours: ${data.downtimeHours.toFixed(1)}`);
    doc.text(`Maintenance cost: $${data.maintenanceCost.toFixed(2)}`);
    doc.text(`MTTR: ${data.mttr.toFixed(2)} h`);
    doc.text(`MTBF: ${data.mtbf.toFixed(2)} h`);
    doc.moveDown();
    doc.text('Status distribution:');
    data.statuses.forEach((entry) => {
      doc.text(` • ${entry.status}: ${entry.count}`);
    });
    doc.end();
  } catch (err) {
    next(err);
  }
};

export const pmWhatIfSimulationsJson = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data: PmOptimizationWhatIfResponse = await getPmWhatIfSimulations(req.tenantId!);
    sendResponse(res, data);
  } catch (err) {
    next(err);
  }
};

export const trendJson = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const filters = parseFilters(req);
    const data = await getTrendDatasets(req.tenantId!, filters);
    sendResponse(res, data);
  } catch (err) {
    next(err);
  }
};

export const trendCsv = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const filters = parseFilters(req);
    const data = await getTrendDatasets(req.tenantId!, filters);
    const parser = new Json2csvParser();
    const csv = parser.parse(mergeTrendResult(data));
    res.header('Content-Type', 'text/csv');
    res.attachment('trends.csv');
    res.send(csv);
  } catch (err) {
    next(err);
  }
};

export const trendPdf = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const filters = parseFilters(req);
    const data = await getTrendDatasets(req.tenantId!, filters);
    const merged = mergeTrendResult(data);
    const doc = createPdfDocument({ margin: 40 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=trends.pdf');
    doc.pipe(res);
    doc.fontSize(18).text('Analytics Trends', { align: 'center' });
    doc.moveDown();
    merged.forEach((row) => {
      const { period, oee, availability, performance, quality, energy, downtime } = row;
      doc.fontSize(12).text(`Period: ${period}`);
      doc.text(`  OEE: ${((oee as number) ?? 0).toFixed(2)}`);
      doc.text(`  Availability: ${((availability as number) ?? 0).toFixed(2)}`);
      doc.text(`  Performance: ${((performance as number) ?? 0).toFixed(2)}`);
      doc.text(`  Quality: ${((quality as number) ?? 0).toFixed(2)}`);
      doc.text(`  Energy (kWh): ${((energy as number) ?? 0).toFixed(2)}`);
      doc.text(`  Downtime (min): ${((downtime as number) ?? 0).toFixed(2)}`);
      doc.moveDown();
    });
    doc.end();
  } catch (err) {
    next(err);
  }
};

