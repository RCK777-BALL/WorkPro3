/*
 * SPDX-License-Identifier: MIT
 */

import { Router, type Request, type Response } from 'express';
import { z } from 'zod';

import { findIdentityProvider } from '../services/identityProviderService';
import { isOidcEnabled, isSamlEnabled } from '../config/featureFlags';

const router = Router();

const tenantParamsSchema = z.object({
  tenantId: z.string().min(1, 'Tenant is required'),
  provider: z.string().optional(),
});

const resolveTenantParams = (
  req: Request,
): { tenantId: string; provider?: string | undefined } | null => {
  const parsed = tenantParamsSchema.safeParse({
    tenantId: req.params.tenantId,
    provider: typeof req.query.provider === 'string' ? req.query.provider : undefined,
  });

  if (!parsed.success) {
    return null;
  }

  const { tenantId, provider } = parsed.data;
  return { tenantId, provider };
};

router.get('/:tenantId/oidc/metadata', async (req: Request, res: Response) => {
  const params = resolveTenantParams(req);
  if (!params) {
    res.status(400).json({ message: 'Invalid tenant or provider' });
    return;
  }

  if (!isOidcEnabled()) {
    res.status(404).json({ message: 'OIDC is disabled' });
    return;
  }

  const provider = await findIdentityProvider(params.tenantId, 'oidc', params.provider);
  if (!provider) {
    res.status(404).json({ message: 'OIDC provider not found' });
    return;
  }

  res.json({
    issuer: provider.issuer || `https://sso.example.com/${provider.slug}`,
    authorization_endpoint: provider.authorizationUrl || provider.ssoUrl || '',
    token_endpoint: provider.tokenUrl || '',
    jwks_uri: provider.metadataUrl || '',
    redirect_uri: provider.redirectUrl || '',
    certificates: provider.certificates,
  });
});

router.get('/:tenantId/saml/metadata', async (req: Request, res: Response) => {
  const params = resolveTenantParams(req);
  if (!params) {
    res.status(400).json({ message: 'Invalid tenant or provider' });
    return;
  }

  if (!isSamlEnabled()) {
    res.status(404).json({ message: 'SAML is disabled' });
    return;
  }

  const provider = await findIdentityProvider(params.tenantId, 'saml', params.provider);
  if (!provider) {
    res.status(404).json({ message: 'SAML provider not found' });
    return;
  }

  const certificate = provider.certificates?.[0];
  const certificateBlock = certificate
    ? `<KeyDescriptor use="signing"><ds:KeyInfo><ds:X509Data><ds:X509Certificate>${certificate}</ds:X509Certificate></ds:X509Data></ds:KeyInfo></KeyDescriptor>`
    : '';

  const xml = `<?xml version="1.0"?>
<EntityDescriptor entityID="${provider.issuer || provider.slug}" xmlns="urn:oasis:names:tc:SAML:2.0:metadata" xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
  <SPSSODescriptor AuthnRequestsSigned="false" WantAssertionsSigned="true" protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    ${certificateBlock}
    <AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="${provider.acsUrl || provider.redirectUrl || ''}" index="1" isDefault="true" />
  </SPSSODescriptor>
</EntityDescriptor>`;

  res.type('application/xml').send(xml);
});

router.post('/:tenantId/saml/acs', (req: Request, res: Response) => {
  if (!isSamlEnabled()) {
    res.status(404).json({ message: 'SAML is disabled' });
    return;
  }

  const relayState =
    typeof (req.body as Record<string, unknown>).RelayState === 'string'
      ? (req.body as Record<string, unknown>).RelayState
      : typeof (req.body as Record<string, unknown>).relayState === 'string'
        ? (req.body as Record<string, unknown>).relayState
        : undefined;

  const samlResponse =
    (req.body as Record<string, unknown>).SAMLResponse ||
    (req.body as Record<string, unknown>).samlResponse ||
    null;

  res.status(202).json({
    message: 'SAML response accepted for processing',
    tenantId: req.params.tenantId,
    relayState: relayState || null,
    receivedResponse: Boolean(samlResponse),
  });
});

router.get('/:tenantId/saml/redirect', (req: Request, res: Response) => {
  if (!isSamlEnabled()) {
    res.status(404).json({ message: 'SAML is disabled' });
    return;
  }

  const relayState = typeof req.query.RelayState === 'string' ? req.query.RelayState : undefined;
  res.json({
    message: 'SAML redirect placeholder',
    tenantId: req.params.tenantId,
    relayState: relayState || null,
  });
});

export default router;
