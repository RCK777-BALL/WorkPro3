/*
 * SPDX-License-Identifier: MIT
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import mongoose, { Types } from 'mongoose';

import IdentityProviderConfig from '../models/IdentityProviderConfig';

const buildApp = async () => {
  const app = express();
  app.use(express.json());
  const authRoutes = (await import('../routes/AuthRoutes')).default;
  app.use('/api/auth', authRoutes);
  return app;
};

describe('SSO route guards and metadata', () => {
  beforeEach(async () => {
    vi.resetModules();
    await mongoose.disconnect();
    // Clear compiled model cache between test runs
    (mongoose as any).models = {};
    (mongoose as any).modelSchemas = {};
    process.env = { ...process.env, JWT_SECRET: 'secret', ENABLE_OIDC: 'true', ENABLE_SAML: 'true' };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('guards OIDC routes when disabled', async () => {
    process.env.ENABLE_OIDC = 'false';
    const app = await buildApp();
    const res = await request(app).get('/api/auth/oidc/okta');
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('OIDC is disabled');
  });

  it('returns metadata for configured OIDC providers', async () => {
    process.env.OKTA_ISSUER = 'https://login.example.com';
    process.env.OKTA_CLIENT_ID = 'client';
    process.env.OKTA_CLIENT_SECRET = 'secret';

    const app = await buildApp();
    const res = await request(app).get('/api/auth/oidc/okta/metadata');
    expect(res.status).toBe(200);
    expect(res.body.data.issuer).toBe('https://login.example.com');
    expect(res.body.data.callbackPath).toContain('/api/auth/oidc/okta/callback');
  });

  it('serves SAML metadata and falls back to defaults', async () => {
    const tenantId = new Types.ObjectId();
    vi.spyOn(IdentityProviderConfig, 'findOne').mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        tenantId,
        name: 'primary',
        type: 'saml',
        certificate: 'TESTCERT',
        acsUrl: '/api/auth/saml/custom/acs',
      }),
    } as never);

    const app = await buildApp();
    const res = await request(app).get(`/api/auth/saml/${tenantId.toString()}/metadata`);
    expect(res.status).toBe(200);
    expect(res.type).toContain('xml');
    expect(res.text).toContain('MIIC...REPLACE_ME');
    expect(res.text).toContain(`/api/auth/saml/${tenantId.toString()}/acs`);
  });

  it('guards SAML metadata when disabled', async () => {
    process.env.ENABLE_SAML = 'false';
    const app = await buildApp();
    const res = await request(app).get('/api/auth/saml/tenant/metadata');
    expect(res.status).toBe(404);
  });
});
