import { describe, it, beforeEach, expect, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

// Mock auth middleware to inject a tenant id without requiring a real token
vi.mock('../middleware/authMiddleware', () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.tenantId = 'tenant123';
    next();
  },
}));

// Mock the analytics service so routes can be tested in isolation
const getKPIs = vi.fn();
vi.mock('../services/analytics', () => ({
  getKPIs: (...args: any[]) => getKPIs(...args),
}));

// Import router after mocks so it uses the mocked dependencies
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
  getKPIs.mockResolvedValue({ mttr: 1, mtbf: 5, backlog: 2 });
});

describe('Analytics routes', () => {
  it('returns KPI data as JSON', async () => {
    const res = await request(app).get('/api/v1/analytics/kpis').expect(200);
    expect(res.body).toEqual({ mttr: 1, mtbf: 5, backlog: 2 });
    expect(getKPIs).toHaveBeenCalledWith('tenant123');
  });

  it('exports KPI data as CSV, XLSX and PDF', async () => {
    const csvRes = await request(app).get('/api/v1/analytics/kpis.csv').expect(200);
    expect(csvRes.headers['content-type']).toContain('text/csv');
    expect(csvRes.text).toContain('mttr');
    expect(getKPIs).toHaveBeenCalledWith('tenant123');

    getKPIs.mockClear();
    const xlsxRes = await request(app)
      .get('/api/v1/analytics/kpis.xlsx')
      .buffer()
      .parse(binaryParser)
      .expect(200);
    expect(xlsxRes.headers['content-type']).toContain('spreadsheet');
    expect(xlsxRes.body.length).toBeGreaterThan(0);
    expect(getKPIs).toHaveBeenCalledWith('tenant123');

    getKPIs.mockClear();
    const pdfRes = await request(app)
      .get('/api/v1/analytics/kpis.pdf')
      .buffer()
      .parse(binaryParser)
      .expect(200);
    expect(pdfRes.headers['content-type']).toBe('application/pdf');
    expect(pdfRes.body.slice(0, 4).toString()).toBe('%PDF');
    expect(getKPIs).toHaveBeenCalledWith('tenant123');
  });
});

