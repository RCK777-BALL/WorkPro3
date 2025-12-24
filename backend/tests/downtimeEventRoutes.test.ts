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

const listDowntimeEvents = vi.fn();
const createDowntimeEvent = vi.fn();
const updateDowntimeEvent = vi.fn();
const deleteDowntimeEvent = vi.fn();
const getDowntimeEvent = vi.fn();

vi.mock('../services/downtimeEvents', () => ({
  listDowntimeEvents: (...args: any[]) => listDowntimeEvents(...args),
  createDowntimeEvent: (...args: any[]) => createDowntimeEvent(...args),
  updateDowntimeEvent: (...args: any[]) => updateDowntimeEvent(...args),
  deleteDowntimeEvent: (...args: any[]) => deleteDowntimeEvent(...args),
  getDowntimeEvent: (...args: any[]) => getDowntimeEvent(...args),
}));

vi.mock('../utils', async () => {
  const actual = await vi.importActual<any>('../utils');
  return { ...actual, writeAuditLog: vi.fn() };
});

import DowntimeEventRoutes from '../routes/DowntimeEventRoutes';

const app = express();
app.use(express.json());
app.use('/api/downtime-events', DowntimeEventRoutes);

beforeEach(() => {
  listDowntimeEvents.mockReset();
  createDowntimeEvent.mockReset();
  updateDowntimeEvent.mockReset();
  deleteDowntimeEvent.mockReset();
  getDowntimeEvent.mockReset();
});

describe('Downtime event routes', () => {
  it('lists downtime events with filters', async () => {
    listDowntimeEvents.mockResolvedValue([{ id: 'evt-1' }]);

    const res = await request(app)
      .get('/api/downtime-events?assetId=asset-1&activeOnly=true&causeCode=ELEC&start=2024-01-01&end=2024-01-31')
      .expect(200);

    expect(res.body.data).toEqual([{ id: 'evt-1' }]);
    expect(listDowntimeEvents).toHaveBeenCalledWith('tenant123', {
      assetId: 'asset-1',
      workOrderId: undefined,
      causeCode: 'ELEC',
      activeOnly: true,
      start: new Date('2024-01-01'),
      end: new Date('2024-01-31'),
    });
  });

  it('creates and updates downtime events', async () => {
    createDowntimeEvent.mockResolvedValue({ _id: 'evt-1', assetId: 'asset-1' });
    updateDowntimeEvent.mockResolvedValue({ _id: 'evt-1', causeCode: 'ELEC' });
    getDowntimeEvent.mockResolvedValue({ _id: 'evt-1', toObject: () => ({ _id: 'evt-1' }) });

    const created = await request(app)
      .post('/api/downtime-events')
      .send({ assetId: 'asset-1', start: new Date().toISOString(), causeCode: 'ELEC', reason: 'Fuse' })
      .expect(201);
    expect(created.body.data._id).toBe('evt-1');

    const updated = await request(app)
      .put('/api/downtime-events/evt-1')
      .send({ causeCode: 'ELEC' })
      .expect(200);
    expect(updated.body.data.causeCode).toBe('ELEC');
  });

  it('deletes downtime events', async () => {
    deleteDowntimeEvent.mockResolvedValue({ _id: new Types.ObjectId() });

    const res = await request(app).delete('/api/downtime-events/evt-1').expect(200);
    expect(res.body.data.message).toBe('Deleted successfully');
  });

  it('exports downtime events to CSV', async () => {
    listDowntimeEvents.mockResolvedValue([
      {
        _id: new Types.ObjectId(),
        tenantId: new Types.ObjectId('656000000000000000000000'),
        assetId: new Types.ObjectId('656000000000000000000001'),
        start: new Date('2024-01-05T10:00:00Z'),
        end: new Date('2024-01-05T11:00:00Z'),
        causeCode: 'ELEC',
        reason: 'Power surge',
        impactMinutes: 60,
      },
    ]);

    const res = await request(app).get('/api/downtime-events/export.csv').expect(200);
    const records = parse(res.text, { columns: true, skip_empty_lines: true });
    expect(records[0]['Cause Code']).toBe('ELEC');
    expect(records[0]['Impact Minutes']).toBe('60');
  });
});
