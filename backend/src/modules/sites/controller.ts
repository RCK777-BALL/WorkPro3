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
  const body = req.body as { name?: string; description?: string };
  if (!body.name || typeof body.name !== 'string') {
    fail(res, 'name is required', 400);
    return;
  }
  try {
    const data = await createSite({ tenantId: req.tenantId! }, { name: body.name, description: body.description });
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
