/*
 * SPDX-License-Identifier: MIT
 */

import type { Request, Response } from 'express';

import IdentityProviderConfig from '../models/IdentityProviderConfig';
import { isFeatureEnabled } from '../utils/featureFlags';
import sendResponse from '../utils/sendResponse';

const buildMetadataXml = (tenantId: string, entityId: string, acsUrl: string, certificate?: string) => {
  const cert = certificate ?? 'MIIC...REPLACE_ME';
  return `<?xml version="1.0"?>\n<EntityDescriptor entityID="${entityId}" xmlns="urn:oasis:names:tc:SAML:2.0:metadata">\n  <SPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">\n    <AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="${acsUrl}" index="1"/>\n    <KeyDescriptor use="signing">\n      <KeyInfo xmlns="http://www.w3.org/2000/09/xmldsig#">\n        <X509Data><X509Certificate>${cert}</X509Certificate></X509Data>\n      </KeyInfo>\n    </KeyDescriptor>\n  </SPSSODescriptor>\n  <Organization><OrganizationName>${tenantId}</OrganizationName></Organization>\n</EntityDescriptor>`;
};

export const getSamlMetadata = async (tenantId: string): Promise<string> => {
  const isConnected = IdentityProviderConfig.db?.readyState === 1;
  const config = isConnected
    ? await IdentityProviderConfig.findOne({ tenantId, type: 'saml', enabled: true })
        .lean()
        .catch(() => null)
    : null;
  const entityId = config?.entityId ?? `urn:workpro:${tenantId}`;
  const acsUrl = config?.acsUrl ?? `/api/auth/saml/${tenantId}/acs`;
  const certificate = config?.certificate ?? config?.metadataXml;
  return buildMetadataXml(tenantId, entityId, acsUrl, certificate);
};

export const samlAcsPlaceholder = async (req: Request, res: Response) => {
  if (!isFeatureEnabled('saml')) {
    res.status(404).json({ message: 'SAML is not enabled' });
    return;
  }

  sendResponse(
    res,
    {
      received: true,
      relayState: req.body?.RelayState,
      samlResponse: req.body?.SAMLResponse,
    },
    null,
    202,
    'SAML assertion received',
  );
};

export const samlRedirectPlaceholder = (req: Request, res: Response) => {
  if (!isFeatureEnabled('saml')) {
    res.status(404).json({ message: 'SAML is not enabled' });
    return;
  }
  const target = typeof req.query.redirect === 'string' ? req.query.redirect : undefined;
  sendResponse(
    res,
    { redirect: target ?? '/login', hint: 'Integrate SAML login and redirect to SP' },
    null,
    200,
    'SAML redirect placeholder',
  );
};

export default {
  getSamlMetadata,
  samlAcsPlaceholder,
  samlRedirectPlaceholder,
};
