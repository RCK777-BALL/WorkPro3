import { describe, it, beforeEach, expect, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';

const tenantId = new mongoose.Types.ObjectId().toString();

vi.mock('../middleware/authMiddleware', () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.tenantId = tenantId;
    next();
  },
  requireRole: () => (_req: any, _res: any, next: any) => next(),
}));
vi.mock('../middleware/tenantScope', () => ({
  default: (req: any, _res: any, next: any) => {
    req.tenantId = tenantId;
    req.siteId = new mongoose.Types.ObjectId().toString();
    next();
  },
}));

const getKPIs = vi.fn();
const getTrendDatasets = vi.fn();
const getDashboardKpiSummary = vi.fn();
const getMaintenanceMetrics = vi.fn();
vi.mock('../services/analytics', () => ({
  getKPIs: (...args: any[]) => getKPIs(...args),
  getTrendDatasets: (...args: any[]) => getTrendDatasets(...args),
  getDashboardKpiSummary: (...args: any[]) => getDashboardKpiSummary(...args),
  getMaintenanceMetrics: (...args: any[]) => getMaintenanceMetrics(...args),
}));

import AnalyticsRoutes from '../routes/analyticsRoutes';

const app = express();
app.use(express.json());
app.use('/api/v1/analytics', AnalyticsRoutes);

function binaryParser(res: any, callback: any) {
  res.setEncoding('binary');
  let data = '';
  res.on('data', (chunk: string) => {
    data += chunk;
  });
  res.on('end', () => callback(null, Buffer.from(data, 'binary')));
}

beforeEach(() => {
  getKPIs.mockReset();
  getTrendDatasets.mockReset();
  getDashboardKpiSummary.mockReset();
  getMaintenanceMetrics.mockReset();
  getKPIs.mockResolvedValue({
    mttr: 1,
    mtbf: 5,
    backlog: 2,
    availability: 0.9,
    performance: 0.92,
    quality: 0.95,
    oee: 0.786,
    energy: { totalKwh: 10, averagePerHour: 2, perAsset: [], perSite: [] },
    downtime: { totalMinutes: 30, reasons: [], trend: [] },
    benchmarks: { assets: [], sites: [] },
    thresholds: { availability: 0.85, performance: 0.9, quality: 0.95, oee: 0.8 },
    range: { start: undefined, end: undefined },
  });
  getTrendDatasets.mockResolvedValue({
    oee: [{ period: '2026-01', value: 80 }],
    availability: [{ period: '2026-01', value: 90 }],
    performance: [{ period: '2026-01', value: 88 }],
    quality: [{ period: '2026-01', value: 92 }],
    energy: [{ period: '2026-01', value: 40 }],
    downtime: [{ period: '2026-01', value: 4 }],
  });
  getDashboardKpiSummary.mockResolvedValue({
    statuses: [],
    overdue: 1,
    pmCompliance: { total: 2, completed: 1, percentage: 50 },
    downtimeHours: 4,
    maintenanceCost: 100,
    partsSpend: 60,
    backlogAgingDays: 5,
    laborUtilization: 75,
    mttr: 1,
    mtbf: 3,
  });
  getMaintenanceMetrics.mockResolvedValue({
    mttr: 1.5,
    mtbf: 6.5,
    backlog: 4,
    pmCompliance: { total: 12, completed: 10, percentage: 83.3 },
    range: { start: undefined, end: undefined },
  });
});

describe('Analytics routes', () => {
  it('returns KPI data as JSON', async () => {
    const res = await request(app).get('/api/v1/analytics/kpis').expect(200);
    expect(res.body.data).toMatchObject({
      mttr: 1,
      mtbf: 5,
      backlog: 2,
      availability: 0.9,
    });
    expect(getKPIs).toHaveBeenCalledWith(
      tenantId,
      expect.objectContaining({ siteIds: expect.any(Array) }),
    );

  });

  it('exports KPI data as CSV, XLSX and PDF', async () => {
    const csvRes = await request(app).get('/api/v1/analytics/kpis.csv').expect(200);
    expect(csvRes.headers['content-type']).toContain('text/csv');
    expect(csvRes.text).toContain('mttr');


    const xlsxRes = await request(app)
      .get('/api/v1/analytics/kpis.xlsx')
      .buffer()
      .parse(binaryParser)
      .expect(200);
    expect(xlsxRes.headers['content-type']).toContain('spreadsheet');
    expect(xlsxRes.body.length).toBeGreaterThan(0);


    const pdfRes = await request(app)
      .get('/api/v1/analytics/kpis.pdf')
      .buffer()
      .parse(binaryParser)
      .expect(200);
    expect(pdfRes.headers['content-type']).toBe('application/pdf');
    expect(pdfRes.body.slice(0, 4).toString()).toBe('%PDF');

  });

  it('returns trend datasets with exports', async () => {
    const jsonRes = await request(app).get('/api/v1/analytics/trends').expect(200);
    expect(jsonRes.body.data).toEqual({
      oee: [{ period: '2026-01', value: 80 }],
      availability: [{ period: '2026-01', value: 90 }],
      performance: [{ period: '2026-01', value: 88 }],
      quality: [{ period: '2026-01', value: 92 }],
      energy: [{ period: '2026-01', value: 40 }],
      downtime: [{ period: '2026-01', value: 4 }],
    });
    expect(getTrendDatasets).toHaveBeenCalledWith(
      tenantId,
      expect.objectContaining({ siteIds: expect.any(Array) }),
    );

    const csvRes = await request(app).get('/api/v1/analytics/trends.csv').expect(200);
    expect(csvRes.headers['content-type']).toContain('text/csv');

    const pdfRes = await request(app)
      .get('/api/v1/analytics/trends.pdf')
      .buffer()
      .parse(binaryParser)
      .expect(200);
    expect(pdfRes.headers['content-type']).toBe('application/pdf');
    expect(pdfRes.body.slice(0, 4).toString()).toBe('%PDF');
  });

  it('schedules dashboard exports', async () => {
    const res = await request(app)
      .post('/api/v1/analytics/dashboard/exports/schedule')
      .send({ format: 'pdf', recipients: ['ops@example.com'], cron: '0 6 * * 1' })
      .expect(201);

    expect(res.body.data.format).toBe('pdf');
    expect(res.body.data.recipients).toEqual(['ops@example.com']);
    expect(res.body.data.status).toBe('scheduled');
  });

  it('returns dashboard KPIs with extended metrics', async () => {
    const res = await request(app).get('/api/v1/analytics/dashboard/kpis').expect(200);
    expect(res.body.data.backlogAgingDays).toBe(5);
    expect(res.body.data.laborUtilization).toBe(75);
    expect(getDashboardKpiSummary).toHaveBeenCalledWith(
      tenantId,
      expect.objectContaining({ siteIds: expect.any(Array) }),
    );
  });

  it('returns maintenance metrics with exports', async () => {
    const res = await request(app).get('/api/v1/analytics/maintenance').expect(200);
    expect(res.body.data).toMatchObject({
      mttr: 1.5,
      mtbf: 6.5,
      backlog: 4,
      pmCompliance: { total: 12, completed: 10, percentage: 83.3 },
    });
    expect(getMaintenanceMetrics).toHaveBeenCalledWith(
      tenantId,
      expect.objectContaining({ siteIds: expect.any(Array) }),
    );

    const csvRes = await request(app).get('/api/v1/analytics/maintenance.csv').expect(200);
    expect(csvRes.headers['content-type']).toContain('text/csv');

    const xlsxRes = await request(app)
      .get('/api/v1/analytics/maintenance.xlsx')
      .buffer()
      .parse(binaryParser)
      .expect(200);
    expect(xlsxRes.headers['content-type']).toContain('spreadsheet');
    expect(xlsxRes.body.length).toBeGreaterThan(0);
  });
});
