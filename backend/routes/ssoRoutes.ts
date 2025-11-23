/*
 * SPDX-License-Identifier: MIT
 */

import { Router, type Request, type Response } from 'express';
import { Types } from 'mongoose';

import IdentityProviderConfig from '../models/IdentityProviderConfig';
import sendResponse from '../utils/sendResponse';
import { isFeatureEnabled } from '../config/featureFlags';

const router = Router();

const ensureTenantId = (tenantId: string, res: Response): tenantId is string => {
  if (!Types.ObjectId.isValid(tenantId)) {
    sendResponse(res, null, 'Invalid tenant id', 400);
    return false;
  }
  return true;
};

const ensureFeature = (feature: 'oidc' | 'saml', res: Response): boolean => {
  if (!isFeatureEnabled(feature)) {
    sendResponse(res, null, `${feature.toUpperCase()} is disabled`, 404);
    return false;
  }
  return true;
};

router.get('/tenants/:tenantId/oidc/metadata', async (req: Request, res: Response) => {
  const { tenantId } = req.params;
  if (!ensureTenantId(tenantId, res) || !ensureFeature('oidc', res)) {
    return;
  }

  const metadata = await IdentityProviderConfig.findOne({
    tenantId,
    protocol: 'oidc',
    enabled: true,
  })
    .select('+clientSecret')
    .lean();

  if (!metadata) {
    sendResponse(res, null, 'No OIDC metadata configured for tenant', 404);
    return;
  }

  sendResponse(res, {
    issuer: metadata.issuer,
    clientId: metadata.clientId,
    redirectUri: metadata.redirectUri,
    metadataUrl: metadata.metadataUrl,
    provider: metadata.provider,
  });
});

router.get('/tenants/:tenantId/saml/metadata', async (req: Request, res: Response) => {
  const { tenantId } = req.params;
  if (!ensureTenantId(tenantId, res) || !ensureFeature('saml', res)) {
    return;
  }

  const metadata = await IdentityProviderConfig.findOne({
    tenantId,
    protocol: 'saml',
    enabled: true,
  }).lean();

  if (!metadata) {
    sendResponse(res, null, 'No SAML metadata configured for tenant', 404);
    return;
  }

  sendResponse(res, {
    entityId: metadata.issuer,
    acsUrl: metadata.acsUrl,
    certificates: metadata.certificates,
    metadataUrl: metadata.metadataUrl,
    provider: metadata.provider,
    metadataXml: metadata.metadataXml,
  });
});

router.get('/tenants/:tenantId/saml/redirect', async (req: Request, res: Response) => {
  const { tenantId } = req.params;
  if (!ensureTenantId(tenantId, res) || !ensureFeature('saml', res)) {
    return;
  }

  const metadata = await IdentityProviderConfig.findOne({
    tenantId,
    protocol: 'saml',
    enabled: true,
  }).lean();

  sendResponse(
    res,
    {
      redirect: metadata?.redirectUri,
    },
    null,
    200,
    'SAML redirect endpoint is a placeholder; plug in your IdP handler.',
  );
});

router.post('/tenants/:tenantId/saml/acs', async (req: Request, res: Response) => {
  const { tenantId } = req.params;
  if (!ensureTenantId(tenantId, res) || !ensureFeature('saml', res)) {
    return;
  }

  sendResponse(
    res,
    {
      received: Boolean(req.body),
      issuer: req.body?.issuer || req.body?.Issuer,
    },
    null,
    202,
    'Assertion Consumer Service stubbed out for integration',
  );
});

export default router;
