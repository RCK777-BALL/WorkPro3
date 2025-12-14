/*
 * SPDX-License-Identifier: MIT
 */

import type { Request, Response } from 'express';

import IdentityProviderConfig from '../models/IdentityProviderConfig';
import { isFeatureEnabled } from '../utils/featureFlags';
import sendResponse from '../utils/sendResponse';

export interface ParsedSamlAssertion {
  email: string;
  name?: string;
  roles?: string[];
  relayState?: string;
  rawResponse?: string;
}

const buildMetadataXml = (tenantId: string, entityId: string, acsUrl: string, certificate?: string) => {
  const cert = certificate ?? 'MIIC...REPLACE_ME';
  return `<?xml version="1.0"?>\n<EntityDescriptor entityID="${entityId}" xmlns="urn:oasis:names:tc:SAML:2.0:metadata">\n  <SPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">\n    <AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="${acsUrl}" index="1"/>\n    <KeyDescriptor use="signing">\n      <KeyInfo xmlns="http://www.w3.org/2000/09/xmldsig#">\n        <X509Data><X509Certificate>${cert}</X509Certificate></X509Data>\n      </KeyInfo>\n    </KeyDescriptor>\n  </SPSSODescriptor>\n  <Organization><OrganizationName>${tenantId}</OrganizationName></Organization>\n</EntityDescriptor>`;
};

const extractRelayState = (body: Record<string, unknown>): string | undefined => {
  if (typeof body.RelayState === 'string') return body.RelayState;
  if (typeof body.relayState === 'string') return body.relayState;
  return undefined;
};

const extractEmail = (body: Record<string, unknown>, attributes: Record<string, unknown>): string | undefined => {
  const candidates = [
    body.email,
    body.Email,
    body.userName,
    body.UserId,
    attributes.email,
    attributes.mail,
    attributes.NameID,
    attributes.nameId,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.includes('@')) {
      return candidate.toLowerCase();
    }
  }
  return undefined;
};

const decodeAssertion = (payload: string | undefined): { raw: string; attributes: Record<string, unknown> } => {
  if (!payload) return { raw: '', attributes: {} };
  try {
    const decoded = Buffer.from(payload, 'base64').toString('utf8');
    return { raw: decoded, attributes: {} };
  } catch {
    return { raw: payload, attributes: {} };
  }
};

export const samlResponseHandler = (req: Request): ParsedSamlAssertion => {
  if (!isFeatureEnabled('saml')) {
    throw new Error('SAML is not enabled');
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const relayState = extractRelayState(body);
  const samlResponse =
    (typeof body.SAMLResponse === 'string' && body.SAMLResponse) ||
    (typeof body.samlResponse === 'string' && body.samlResponse) ||
    undefined;

  const decoded = decodeAssertion(samlResponse);
  const attributes = (body.attributes as Record<string, unknown> | undefined) ??
    (body.profile as Record<string, unknown> | undefined) ??
    decoded.attributes;

  const email = extractEmail(body, attributes ?? {});
  if (!email) {
    throw new Error('SAML assertion missing email');
  }

  const rolesCandidate = attributes?.roles || attributes?.Groups || attributes?.groups;
  const roles = Array.isArray(rolesCandidate)
    ? rolesCandidate.filter((role): role is string => typeof role === 'string')
    : [];

  const name =
    (typeof attributes?.displayName === 'string' && attributes.displayName) ||
    (typeof attributes?.name === 'string' && attributes.name) ||
    (typeof body.name === 'string' && body.name) ||
    undefined;

  return {
    email,
    name,
    roles,
    relayState,
    rawResponse: decoded.raw,
  };
};

export const getSamlMetadata = async (tenantId: string): Promise<string> => {
  const isConnected = IdentityProviderConfig.db?.readyState === 1;
  const config = isConnected
    ? await IdentityProviderConfig.findOne({ tenantId, protocol: 'saml', enabled: true })
        .lean()
        .catch(() => null)
    : null;
  const entityId = config?.issuer ?? `urn:workpro:${tenantId}`;
  const acsUrl = config?.acsUrl ?? `/api/auth/saml/${tenantId}/acs`;
  const certificate = config?.certificates?.[0]?.pem ?? config?.metadataXml;
  return buildMetadataXml(tenantId, entityId, acsUrl, certificate);
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
  samlResponseHandler,
  samlRedirectPlaceholder,
};
