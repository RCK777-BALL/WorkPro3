/*
 * SPDX-License-Identifier: MIT
 */

import type { RequestHandler } from 'express';
import { Types } from 'mongoose';

import Site from '../../models/Site';
import logger from '../../utils/logger';

const toOptionalString = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  }
  if (typeof value === 'number' || typeof value === 'bigint') {
    return String(value);
  }
  return undefined;
};

const getValue = (source: unknown, key: string): string | undefined => {
  if (!source || typeof source !== 'object') return undefined;
  return toOptionalString((source as Record<string, unknown>)[key]);
};

const resolveRequestValue = (
  req: { params?: unknown; query?: unknown; body?: unknown },
  key: string,
): string | undefined =>
  getValue(req.params, key) ?? getValue(req.query, key) ?? getValue(req.body, key);

export interface TenantAuthorizationOptions {
  requireTenant?: boolean;
  requireSite?: boolean;
}

const authorizeTenantSite = (
  options: TenantAuthorizationOptions = {},
): RequestHandler =>
  async (req, res, next) => {
    const requireTenant = options.requireTenant ?? true;
    const requireSite = options.requireSite ?? true;

    const tenantId = toOptionalString(req.tenantId);
    if (requireTenant && !tenantId) {
      res.status(400).json({ message: 'Tenant ID is required' });
      return;
    }

    const siteId = toOptionalString(req.siteId ?? req.plantId);
    if (requireSite && !siteId) {
      res.status(400).json({ message: 'Site ID is required' });
      return;
    }

    const requestedTenantId = resolveRequestValue(req, 'tenantId');
    if (requestedTenantId && tenantId && requestedTenantId !== tenantId) {
      res.status(403).json({ message: 'Cross-tenant access denied' });
      return;
    }

    const requestedSiteId =
      resolveRequestValue(req, 'siteId') ?? resolveRequestValue(req, 'plantId');
    if (requestedSiteId && siteId && requestedSiteId !== siteId) {
      res.status(403).json({ message: 'Cross-site access denied' });
      return;
    }

    if (tenantId && siteId) {
      if (!Types.ObjectId.isValid(siteId)) {
        res.status(400).json({ message: 'Invalid site ID' });
        return;
      }
      try {
        const siteExists = await Site.exists({ _id: siteId, tenantId });
        if (!siteExists) {
          res.status(403).json({ message: 'Site does not belong to tenant' });
          return;
        }
      } catch (error) {
        logger.warn('authorizeTenantSite: site lookup failed', { error, siteId, tenantId });
        res.status(500).json({ message: 'Unable to validate site scope' });
        return;
      }
    }

    next();
  };

export default authorizeTenantSite;
