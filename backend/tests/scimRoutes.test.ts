/*
 * SPDX-License-Identifier: MIT
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

const buildApp = async () => {
  const app = express();
  app.use(express.json());
  const scimRoutes = (await import('../routes/ScimRoutes')).default;
  app.use('/api/scim', scimRoutes);
  return app;
};

describe('SCIM route stubs', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...process.env, ENABLE_SCIM: 'true', SCIM_BEARER_TOKEN: 'token' };
  });

  it('returns 404 when SCIM is disabled', async () => {
    process.env.ENABLE_SCIM = 'false';
    const app = await buildApp();
    const res = await request(app).get('/api/scim/v2/Users');
    expect(res.status).toBe(404);
  });

  it('rejects missing or invalid bearer tokens', async () => {
    const app = await buildApp();
    const res = await request(app).get('/api/scim/v2/Users');
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid SCIM token');
  });

  it('accepts basic SCIM user payloads', async () => {
    const app = await buildApp();
    const res = await request(app)
      .post('/api/scim/v2/Users')
      .set('Authorization', 'Bearer token')
      .send({ userName: 'user@example.com', active: true });

    expect(res.status).toBe(202);
    expect(res.body.data.id).toBe('pending-sync');
    expect(res.body.data.userName).toBe('user@example.com');
  });
});
