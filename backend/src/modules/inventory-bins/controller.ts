/*
 * SPDX-License-Identifier: MIT
 */

import type { Response } from 'express';

import type { AuthedRequest, AuthedRequestHandler } from '../../../types/http';
import { fail } from '../../lib/http';
import { createBin, listBins } from './service';

const ensureTenant = (req: AuthedRequest, res: Response): req is AuthedRequest & { tenantId: string } => {
  if (!req.tenantId) {
    res.status(400).json({ error: 'Tenant context required' });
    return false;
  }
  return true;
};

const buildContext = (req: AuthedRequest) => ({
  tenantId: req.tenantId!,
  siteId: req.siteId ?? undefined,
});

export const listBinsHandler: AuthedRequestHandler = async (req, res, next) => {
  if (!ensureTenant(req, res)) return;
  try {
    const data = await listBins(buildContext(req));
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const createBinHandler: AuthedRequestHandler = async (req, res, next) => {
  if (!ensureTenant(req, res)) return;
  const body = req.body as { label?: string; capacity?: number; locationId?: string; siteId?: string };
  if (!body.label || typeof body.label !== 'string') {
    fail(res, 'label is required', 400);
    return;
  }
  try {
    const data = await createBin(buildContext(req), {
      label: body.label,
      capacity: typeof body.capacity === 'number' ? body.capacity : undefined,
      locationId: typeof body.locationId === 'string' ? body.locationId : undefined,
      siteId: typeof body.siteId === 'string' ? body.siteId : undefined,
    });
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
