import express from 'express';
import request from 'supertest';
import { parse } from 'csv-parse/sync';
import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../middleware/authMiddleware', () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.tenantId = 'tenant123';
    next();
  },
}));

vi.mock('../middleware/tenantScope', () => ({
  default: (req: any, _res: any, next: any) => {
    req.tenantId ??= 'tenant123';
    next();
  },
}));

const listDowntimeLogs = vi.fn();
vi.mock('../services/downtimeLogs', () => ({
  listDowntimeLogs: (...args: any[]) => listDowntimeLogs(...args),
}));

import DowntimeLogRoutes from '../routes/DowntimeLogRoutes';

const app = express();
app.use('/api/downtime-logs', DowntimeLogRoutes);

describe('Downtime log exports', () => {
  beforeEach(() => {
    listDowntimeLogs.mockReset();
  });

  it('exports downtime logs with headers and filtered rows', async () => {
    const start = new Date('2024-01-05T10:00:00Z');
    const end = new Date('2024-01-05T10:45:00Z');
    listDowntimeLogs.mockResolvedValue([
      {
        _id: new Types.ObjectId(),
        tenantId: new Types.ObjectId('656000000000000000000000'),
        assetId: new Types.ObjectId('656000000000000000000001'),
        start,
        end,
        reason: 'Power outage',
      },
    ]);

    const res = await request(app)
      .get('/api/downtime-logs/export.csv?assetId=asset-1&start=2024-01-01&end=2024-02-01')
      .expect(200);

    expect(listDowntimeLogs).toHaveBeenCalledWith(
      'tenant123',
      expect.objectContaining({
        assetId: 'asset-1',
        start: new Date('2024-01-01'),
        end: new Date('2024-02-01'),
      }),
    );

    const records = parse(res.text, { columns: true, skip_empty_lines: true });
    expect(Object.keys(records[0])).toEqual([
      'Asset ID',
      'Start',
      'End',
      'Duration (minutes)',
      'Reason',
    ]);
    expect(records).toHaveLength(1);
    expect(records[0]['Asset ID']).toBe('656000000000000000000001');
    expect(records[0]['Duration (minutes)']).toBe('45');
    expect(records[0].Reason).toBe('Power outage');
  });
});
