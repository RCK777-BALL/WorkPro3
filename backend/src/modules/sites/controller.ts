/*
 * SPDX-License-Identifier: MIT
 */

import type { Response } from 'express';

import type { AuthedRequest, AuthedRequestHandler } from '../../../types/http';
import { fail } from '../../lib/http';
import { createSite, listSites } from './service';

const ensureTenant = (req: AuthedRequest, res: Response): req is AuthedRequest & { tenantId: string } => {
  if (!req.tenantId) {
    res.status(400).json({ error: 'Tenant context required' });
    return false;
  }
  return true;
};

export const listSitesHandler: AuthedRequestHandler = async (req, res, next) => {
  if (!ensureTenant(req, res)) return;
  try {
    const data = await listSites({ tenantId: req.tenantId! });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const createSiteHandler: AuthedRequestHandler = async (req, res, next) => {
  if (!ensureTenant(req, res)) return;
  const body = req.body as {
    name?: string;
    code?: string;
    description?: string;
    timezone?: string;
    country?: string;
    region?: string;
  };
  if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
    fail(res, 'name is required', 400);
    return;
  }
  const normalize = (value?: string) => (typeof value === 'string' ? value.trim() || undefined : undefined);
  try {
    const data = await createSite(
      { tenantId: req.tenantId! },
      {
        name: body.name.trim(),
        code: normalize(body.code),
        description: normalize(body.description),
        timezone: normalize(body.timezone),
        country: normalize(body.country),
        region: normalize(body.region),
      },
    );
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
