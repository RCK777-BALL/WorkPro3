import { describe, it, beforeEach, expect, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

vi.mock('../middleware/authMiddleware', () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.tenantId = 'tenant123';
    next();
  },
}));

const getKPIs = vi.fn();
const getTrendDatasets = vi.fn();
vi.mock('../services/analytics', () => ({
  getKPIs: (...args: any[]) => getKPIs(...args),
  getTrendDatasets: (...args: any[]) => getTrendDatasets(...args),
}));

import AnalyticsRoutes from '../routes/AnalyticsRoutes';

const app = express();
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
    oee: [],
    availability: [],
    performance: [],
    quality: [],
    energy: [],
    downtime: [],
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
    expect(getKPIs).toHaveBeenCalledWith('tenant123', {});
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
      oee: [],
      availability: [],
      performance: [],
      quality: [],
      energy: [],
      downtime: [],
    });
    expect(getTrendDatasets).toHaveBeenCalledWith('tenant123', {});

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
});
