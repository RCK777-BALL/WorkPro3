import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import scimRoutes from '../routes/scimRoutes';

const mocks = vi.hoisted(() => ({
  saveMock: vi.fn(),
  findOneMock: vi.fn(),
}));

vi.mock('../models/User', () => {
  const ctor = vi.fn(function mockUser(this: any, payload: any) {
    Object.assign(this, payload);
    this._id = payload._id ?? 'generated-id';
    this.save = mocks.saveMock;
    this.roles = payload.roles ?? ['tech'];
  });
  (ctor as any).findOne = mocks.findOneMock;
  return { __esModule: true, default: ctor };
});

vi.mock('../utils/audit', () => ({ writeAuditLog: vi.fn() }));

const app = express();
app.use(express.json());
app.use('/api/scim/v2', scimRoutes);

const tenantId = '507f1f77bcf86cd799439011';

beforeEach(() => {
  process.env.ENABLE_SCIM_API = 'true';
  process.env.SCIM_BEARER_TOKEN = 'token-123';
  mocks.saveMock.mockResolvedValue(undefined);
  mocks.saveMock.mockClear();
  mocks.findOneMock.mockReset();
  mocks.findOneMock.mockReturnValue({ select: vi.fn().mockResolvedValue(null) });
});

describe('SCIM routes', () => {
  it('rejects SCIM calls when disabled', async () => {
    process.env.ENABLE_SCIM_API = 'false';
    await request(app).get('/api/scim/v2/Users').expect(404);
  });

  it('requires bearer token for reads', async () => {
    const res = await request(app)
      .get('/api/scim/v2/Users')
      .set('X-Tenant-Id', tenantId)
      .expect(401);

    expect(res.body.message).toBe('Invalid SCIM token');
  });

  it('accepts user payloads and echoes metadata', async () => {
    const res = await request(app)
      .post('/api/scim/v2/Users')
      .set('Authorization', 'Bearer token-123')
      .set('X-Tenant-Id', tenantId)
      .send({
        userName: 'ada.lovelace',
        emails: [{ value: 'ada@example.com' }],
      })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.meta.tenantId).toBe(tenantId);
    expect(res.body.emails[0].value).toBe('ada@example.com');
  });

  it('updates users via SCIM PATCH', async () => {
    mocks.findOneMock.mockReturnValue({
      select: vi.fn().mockResolvedValue({
        _id: 'existing-id',
        email: 'old@example.com',
        name: 'Old Name',
        employeeId: 'emp-1',
        roles: ['tech'],
        active: true,
        tokenVersion: 1,
        save: mocks.saveMock,
      }),
    });

    const res = await request(app)
      .patch('/api/scim/v2/Users/existing-id')
      .set('Authorization', 'Bearer token-123')
      .set('X-Tenant-Id', tenantId)
      .send({
        emails: [{ value: 'new@example.com' }],
        roles: ['manager'],
      })
      .expect(200);

    expect(res.body.roles).toContain('manager');
    expect(res.body.emails[0].value).toBe('new@example.com');
  });

  it('deactivates users via SCIM DELETE', async () => {
    mocks.findOneMock.mockReturnValue({
      select: vi.fn().mockResolvedValue({
        _id: 'existing-id',
        active: true,
        tokenVersion: 1,
        save: mocks.saveMock,
      }),
    });

    await request(app)
      .delete('/api/scim/v2/Users/existing-id')
      .set('Authorization', 'Bearer token-123')
      .set('X-Tenant-Id', tenantId)
      .expect(204);

    expect(mocks.saveMock).toHaveBeenCalled();
  });
});
