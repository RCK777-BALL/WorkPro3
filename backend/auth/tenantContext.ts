/*
 * SPDX-License-Identifier: MIT
 */

import type { Types } from 'mongoose';

import User, { type UserDocument } from '../models/User';

interface MappingEntry {
  tenantId: string;
  siteId?: string;
}

const parseMapping = (value: string | undefined): Record<string, MappingEntry> => {
  if (!value) {
    return {};
  }

  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .reduce<Record<string, MappingEntry>>((acc, entry) => {
      const [rawKey, rawValue] = entry.split('=').map((part) => part.trim());
      if (!rawKey || !rawValue) {
        return acc;
      }
      const [tenantId, siteId] = rawValue.split(':').map((part) => part.trim());
      if (!tenantId) {
        return acc;
      }
      acc[rawKey.toLowerCase()] = { tenantId, siteId: siteId || undefined };
      return acc;
    }, {});
};

const azureTenantMap = parseMapping(process.env.AZURE_AD_TENANT_MAP);
const googleDomainMap = parseMapping(process.env.GOOGLE_WORKSPACE_DOMAIN_MAP);

const toStringId = (value: Types.ObjectId | string | undefined): string | undefined => {
  if (!value) {
    return undefined;
  }
  if (typeof value === 'string') {
    return value;
  }
  return value.toString();
};

const normalizeRoleList = (input: unknown): string[] => {
  if (!input) {
    return [];
  }
  if (Array.isArray(input)) {
    return input.filter((role): role is string => typeof role === 'string').map((role) => role.toLowerCase());
  }
  if (typeof input === 'string') {
    return [input.toLowerCase()];
  }
  return [];
};

const buildUserContext = (user: UserDocument | null) => {
  if (!user) {
    return {} as TenantResolution;
  }

  const roles = normalizeRoleList(user.roles || (user as { role?: unknown }).role);
  return {
    tenantId: toStringId(user.tenantId as Types.ObjectId | string | undefined),
    siteId: toStringId((user as { siteId?: Types.ObjectId | string }).siteId),
    roles,
    userId: user._id.toString(),
  } satisfies TenantResolution;
};

const extractSiteClaim = (claims: Record<string, unknown> | undefined): string | undefined => {
  const candidate =
    claims?.siteId ||
    claims?.siteID ||
    claims?.site_id ||
    claims?.extension_siteId ||
    claims?.extension_siteID ||
    claims?.extension_site_id;
  return typeof candidate === 'string' && candidate.trim().length > 0
    ? candidate.trim()
    : undefined;
};

export interface TenantResolutionInput {
  provider?: string;
  email?: string;
  domain?: string | null;
  claims?: Record<string, unknown> | undefined;
  profile?: Record<string, unknown> | undefined;
}

export interface TenantResolution {
  tenantId?: string;
  siteId?: string;
  userId?: string;
  roles?: string[];
}

export const resolveTenantContext = async ({
  provider,
  email,
  domain,
  claims,
  profile,
}: TenantResolutionInput): Promise<TenantResolution> => {
  let tenantId: string | undefined;
  let siteId: string | undefined;

  const normalizedProvider = provider?.toLowerCase();

  if (normalizedProvider === 'google' || normalizedProvider === 'google-workspace') {
    const normalizedDomain = (domain ?? profile?.hd ?? '').toString().toLowerCase();
    const mapping = googleDomainMap[normalizedDomain];
    if (mapping) {
      tenantId = mapping.tenantId;
      siteId = mapping.siteId;
    }
  }

  if (normalizedProvider === 'azure') {
    const tidCandidate =
      (claims?.tid as string | undefined) ||
      (claims?.tenantId as string | undefined) ||
      (profile?.tid as string | undefined) ||
      (profile?.tenantId as string | undefined);
    if (tidCandidate) {
      const mapping = azureTenantMap[tidCandidate.toLowerCase()];
      if (mapping) {
        tenantId = mapping.tenantId;
        siteId = mapping.siteId ?? siteId;
      }
    }
    siteId = extractSiteClaim(claims) ?? extractSiteClaim(profile) ?? siteId;
  }

  let userContext: TenantResolution = {};
  if (email) {
    const user = await User.findOne({ email: email.toLowerCase() }).select(
      '+tenantId +siteId +roles +role',
    );
    userContext = buildUserContext(user);
  }

  return {
    tenantId: userContext.tenantId ?? tenantId,
    siteId: userContext.siteId ?? siteId,
    roles: userContext.roles,
    userId: userContext.userId,
  };
};
