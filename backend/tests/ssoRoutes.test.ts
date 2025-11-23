import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import ssoRoutes from '../routes/ssoRoutes';
import type { IdentityProviderDocument } from '../models/IdentityProvider';
import { findIdentityProvider } from '../services/identityProviderService';

vi.mock('../services/identityProviderService', () => ({
  findIdentityProvider: vi.fn(),
}));

const app = express();
app.use(express.json());
app.use('/api/sso', ssoRoutes);

const mockFindIdentityProvider = findIdentityProvider as unknown as ReturnType<typeof vi.fn>;

const buildProvider = (
  overrides: Partial<IdentityProviderDocument> & { protocol: 'oidc' | 'saml' },
): IdentityProviderDocument => ({
  _id: 'id' as unknown as IdentityProviderDocument['_id'],
  tenantId: 'tenant' as unknown as IdentityProviderDocument['tenantId'],
  name: 'Provider',
  slug: 'provider',
  issuer: 'https://issuer.example.com',
  metadataUrl: '',
  authorizationUrl: 'https://issuer.example.com/auth',
  tokenUrl: 'https://issuer.example.com/token',
  redirectUrl: 'https://frontend.example.com/callback',
  acsUrl: 'https://frontend.example.com/acs',
  ssoUrl: 'https://issuer.example.com/sso',
  clientId: 'client',
  clientSecret: 'secret',
  certificates: ['cert-data'],
  rawMetadata: undefined,
  enabled: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

beforeEach(() => {
  process.env.ENABLE_OIDC_SSO = 'true';
  process.env.ENABLE_SAML_SSO = 'true';
  vi.resetAllMocks();
});

describe('SSO routes', () => {
  it('returns OIDC metadata for configured tenant provider', async () => {
    mockFindIdentityProvider.mockResolvedValue(
      buildProvider({ protocol: 'oidc', slug: 'custom', authorizationUrl: 'https://issuer/authorize' }),
    );

    const res = await request(app)
      .get('/api/sso/tenant-id/oidc/metadata?provider=custom')
      .expect(200);

    expect(res.body.authorization_endpoint).toBe('https://issuer/authorize');
    expect(res.body.certificates).toContain('cert-data');
    expect(mockFindIdentityProvider).toHaveBeenCalled();
  });

  it('returns SAML metadata XML when enabled', async () => {
    mockFindIdentityProvider.mockResolvedValue(
      buildProvider({ protocol: 'saml', issuer: 'urn:example:test', certificates: ['ABC123'] }),
    );

    const res = await request(app)
      .get('/api/sso/tenant-id/saml/metadata?provider=saml')
      .expect(200);

    expect(res.type).toContain('application/xml');
    expect(res.text).toContain('urn:example:test');
    expect(res.text).toContain('ABC123');
  });

  it('returns 404 when SAML is disabled', async () => {
    process.env.ENABLE_SAML_SSO = 'false';
    mockFindIdentityProvider.mockResolvedValue(
      buildProvider({ protocol: 'saml', issuer: 'urn:example:test' }),
    );

    await request(app)
      .get('/api/sso/tenant-id/saml/metadata')
      .expect(404);
  });
});
