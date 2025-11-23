/*
 * SPDX-License-Identifier: MIT
 */

import express from 'express';
import request from 'supertest';
import { Types } from 'mongoose';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ssoRoutes from '../routes/ssoRoutes';
import scimRoutes from '../routes/scimRoutes';
import IdentityProviderConfig from '../models/IdentityProviderConfig';

const app = express();
app.use(express.json());
app.use('/api/sso', ssoRoutes);
app.use('/api/scim', scimRoutes);

const findOneSpy = vi.spyOn(IdentityProviderConfig, 'findOne');

const asQuery = <T>(result: T) => ({
  select: vi.fn().mockReturnThis(),
  lean: vi.fn().mockResolvedValue(result),
});

beforeEach(() => {
  findOneSpy.mockReset();
  process.env.ENABLE_SAML = 'true';
  process.env.ENABLE_SCIM = 'true';
  process.env.SCIM_BEARER_TOKEN = 'scim-secret';
});

afterEach(() => {
  findOneSpy.mockReset();
  delete process.env.ENABLE_SAML;
  delete process.env.ENABLE_SCIM;
  delete process.env.SCIM_BEARER_TOKEN;
});

describe('SSO Routes', () => {
  it('returns SAML metadata for a tenant when enabled', async () => {
    const tenantId = new Types.ObjectId();
    findOneSpy.mockReturnValueOnce(
      asQuery({
        tenantId,
        protocol: 'saml',
        provider: 'acme-idp',
        issuer: 'https://idp.example.com',
        acsUrl: 'https://app.example.com/acs',
        certificates: [{ pem: '-----BEGIN CERTIFICATE-----ABC' }],
        metadataXml: '<EntityDescriptor />',
      }),
    );

    const res = await request(app).get(`/api/sso/tenants/${tenantId}/saml/metadata`).expect(200);

    expect(findOneSpy).toHaveBeenCalledWith({ tenantId: tenantId.toString(), protocol: 'saml', enabled: true });
    expect(res.body.success).toBe(true);
    expect(res.body.data.provider).toBe('acme-idp');
    expect(res.body.data.certificates[0].pem).toContain('CERTIFICATE');
  });

  it('rejects SAML requests when the feature flag is disabled', async () => {
    process.env.ENABLE_SAML = 'false';
    const tenantId = new Types.ObjectId();

    const res = await request(app).get(`/api/sso/tenants/${tenantId}/saml/metadata`).expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('disabled');
  });
});

describe('SCIM Routes', () => {
  it('requires a bearer token before returning Users', async () => {
    const tenantRequest = request(app).get('/api/scim/Users');

    await tenantRequest.expect(401);

    const unauthorized = await request(app)
      .get('/api/scim/Users')
      .set('Authorization', 'Bearer nope');
    expect(unauthorized.status).toBe(401);

    const ok = await request(app)
      .get('/api/scim/Users')
      .set('Authorization', 'Bearer scim-secret')
      .expect(200);

    expect(ok.body.data.schemas).toContain('urn:ietf:params:scim:api:messages:2.0:ListResponse');
  });

  it('honors the SCIM feature toggle', async () => {
    process.env.ENABLE_SCIM = 'false';

    const res = await request(app)
      .get('/api/scim/Groups')
      .set('Authorization', 'Bearer scim-secret')
      .expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('disabled');
  });
});
