import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import express from 'express';
import scimRoutes from '../routes/scimRoutes';

const app = express();
app.use(express.json());
app.use('/api/scim/v2', scimRoutes);

beforeEach(() => {
  process.env.ENABLE_SCIM_API = 'true';
  process.env.SCIM_BEARER_TOKEN = 'token-123';
});

describe('SCIM routes', () => {
  it('rejects SCIM calls when disabled', async () => {
    process.env.ENABLE_SCIM_API = 'false';
    await request(app).get('/api/scim/v2/Users').expect(404);
  });

  it('requires bearer token for reads', async () => {
    const res = await request(app)
      .get('/api/scim/v2/Users')
      .set('X-Tenant-Id', 'tenant-1')
      .expect(401);

    expect(res.body.message).toBe('Invalid SCIM token');
  });

  it('accepts user payloads and echoes metadata', async () => {
    const res = await request(app)
      .post('/api/scim/v2/Users')
      .set('Authorization', 'Bearer token-123')
      .set('X-Tenant-Id', 'tenant-1')
      .send({
        userName: 'ada.lovelace',
        emails: [{ value: 'ada@example.com' }],
      })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.meta.tenantId).toBe('tenant-1');
    expect(res.body.emails[0].value).toBe('ada@example.com');
  });
});
