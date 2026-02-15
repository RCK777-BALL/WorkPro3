import express from 'express';
import request from 'supertest';
import { describe, it, beforeEach, expect, vi } from 'vitest';
import { Types } from 'mongoose';

vi.mock('../middleware/authMiddleware', () => ({
  requireAuth: (_req: any, _res: any, next: any) => next(),
}));
vi.mock('../middleware/tenantScope', () => ({
  default: (req: any, _res: any, next: any) => {
    req.tenantId = 'tenant-1';
    next();
  },
}));
vi.mock('../src/middleware/tenantAuthorization', () => ({
  default: () => (_req: any, _res: any, next: any) => next(),
}));
vi.mock('../src/auth/permissions', () => ({
  requirePermission: () => (_req: any, _res: any, next: any) => next(),
}));

const listDowntimeLogs = vi.fn();
const createDowntimeLog = vi.fn();
const updateDowntimeLog = vi.fn();

vi.mock('../services/downtimeLogs', () => ({
  listDowntimeLogs: (...args: any[]) => listDowntimeLogs(...args),
  createDowntimeLog: (...args: any[]) => createDowntimeLog(...args),
  updateDowntimeLog: (...args: any[]) => updateDowntimeLog(...args),
}));

import downtimeRouter from '../src/modules/downtime';

const app = express();
app.use(express.json());
app.use('/api/downtime', downtimeRouter);

beforeEach(() => {
  listDowntimeLogs.mockReset();
  createDowntimeLog.mockReset();
  updateDowntimeLog.mockReset();
});

describe('Downtime module routes', () => {
  const validAssetId = '656000000000000000000001';

  it('validates and lists downtime logs', async () => {
    listDowntimeLogs.mockResolvedValue([{ id: '1' }]);

    const res = await request(app).get(`/api/downtime?assetId=${validAssetId}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([{ id: '1' }]);
    expect(listDowntimeLogs).toHaveBeenCalledWith('tenant-1', {
      assetId: validAssetId,
      start: undefined,
      end: undefined,
    });
  });

  it('rejects invalid create payloads', async () => {
    const res = await request(app).post('/api/downtime').send({ assetId: '' });
    expect(res.status).toBe(400);
    expect(createDowntimeLog).not.toHaveBeenCalled();
  });

  it('creates and updates downtime logs with validation', async () => {
    createDowntimeLog.mockResolvedValue({ _id: 'abc' });
    updateDowntimeLog.mockResolvedValue({ _id: 'abc', reason: 'fixed' });

    const created = await request(app)
      .post('/api/downtime')
      .send({ assetId: validAssetId, start: new Date().toISOString(), reason: 'break' });
    expect(created.status).toBe(201);
    expect(createDowntimeLog).toHaveBeenCalledWith(
      'tenant-1',
      expect.objectContaining({ assetId: expect.any(Types.ObjectId) }),
    );

    const updated = await request(app)
      .put('/api/downtime/abc')
      .send({ reason: 'fixed' });
    expect(updated.status).toBe(200);
    expect(updateDowntimeLog).toHaveBeenCalledWith('tenant-1', 'abc', { reason: 'fixed' });
  });
});
