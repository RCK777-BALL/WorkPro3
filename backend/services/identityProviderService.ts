/*
 * SPDX-License-Identifier: MIT
 */

import type { FilterQuery } from 'mongoose';
import IdentityProvider, {
  type IdentityProviderDocument,
  type IdentityProviderProtocol,
} from '../models/IdentityProvider';

const normalizeKey = (value: string | undefined): string | undefined =>
  value?.toString().trim().toLowerCase() || undefined;

export const findIdentityProvider = async (
  tenantId: string,
  protocol: IdentityProviderProtocol,
  slug?: string,
): Promise<IdentityProviderDocument | null> => {
  const query: FilterQuery<IdentityProviderDocument> = {
    tenantId,
    protocol,
    enabled: true,
  };

  const normalizedSlug = normalizeKey(slug);
  if (normalizedSlug) {
    query.slug = normalizedSlug;
  }

  return IdentityProvider.findOne(query).lean();
};

export const isIdentityProviderAllowed = async (
  providerKey: string,
  protocol: IdentityProviderProtocol,
): Promise<boolean> => {
  const normalizedSlug = normalizeKey(providerKey);
  if (!normalizedSlug) {
    return false;
  }

  const match = await IdentityProvider.findOne({
    slug: normalizedSlug,
    protocol,
    enabled: true,
  })
    .select('_id')
    .lean();

  return Boolean(match);
};

export const listTenantIdentityProviders = async (
  tenantId: string,
  protocol?: IdentityProviderProtocol,
): Promise<IdentityProviderDocument[]> => {
  const query: FilterQuery<IdentityProviderDocument> = { tenantId, enabled: true };
  if (protocol) {
    query.protocol = protocol;
  }
  return IdentityProvider.find(query).lean();
};
