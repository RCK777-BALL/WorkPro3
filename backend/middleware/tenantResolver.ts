/*
 * SPDX-License-Identifier: MIT
 */

import type { NextFunction, Request, Response } from 'express';
import Tenant from '../models/Tenant';
import logger from '../utils/logger';

const tenantCache = new Map<string, string>();

const normalizeDomain = (value?: string | null): string | undefined => {
  if (!value || typeof value !== 'string') return undefined;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return undefined;
  return trimmed.split(':')[0];
};

const resolveTenantIdByDomain = async (domain: string): Promise<string | undefined> => {
  if (tenantCache.has(domain)) {
    return tenantCache.get(domain);
  }

  const tenant = await Tenant.findOne({ $or: [{ domain }, { slug: domain }] })
    .select('_id')
    .lean();

  if (tenant?._id) {
    const id = tenant._id.toString();
    tenantCache.set(domain, id);
    return id;
  }

  return undefined;
};

const tenantResolver = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const headerDomain = normalizeDomain(req.header('x-tenant-domain'));
    const hostDomain = normalizeDomain(req.hostname || req.headers.host as string | undefined);
    const candidateDomain = headerDomain ?? hostDomain;

    if (candidateDomain) {
      const tenantId = await resolveTenantIdByDomain(candidateDomain);
      if (tenantId) {
        req.tenantId = tenantId;
        (req as Request & { tenantDomain?: string }).tenantDomain = candidateDomain;
        res.locals.tenantId = tenantId;
        res.locals.tenantDomain = candidateDomain;
      } else {
        logger.debug('tenantResolver: no tenant found for domain', { domain: candidateDomain });
      }
    }
  } catch (error) {
    logger.error('tenantResolver: failed to resolve tenant', { error });
  }

  next();
};

export default tenantResolver;
