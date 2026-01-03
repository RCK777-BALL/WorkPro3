/*
 * SPDX-License-Identifier: MIT
 */

import type { Response } from 'express';

import type { AuthedRequest, AuthedRequestHandler } from '../../../types/http';
import { fail } from '../../lib/http';
import { createPurchaseRequest, listPurchaseRequests } from './service';

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
  userId:
    typeof req.user?._id === 'string'
      ? req.user._id
      : typeof req.user?.id === 'string'
        ? req.user.id
        : undefined,
});

export const listPurchaseRequestsHandler: AuthedRequestHandler = async (req, res, next) => {
  if (!ensureTenant(req, res)) return;
  try {
    const data = await listPurchaseRequests(buildContext(req));
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const createPurchaseRequestHandler: AuthedRequestHandler = async (req, res, next) => {
  if (!ensureTenant(req, res)) return;
  const body = req.body as { items?: Array<{ partId?: string; quantity?: number; notes?: string }>; notes?: string };
  if (!Array.isArray(body.items) || body.items.length === 0) {
    fail(res, 'items are required', 400);
    return;
  }
  const items = body.items
    .filter((item) => typeof item.partId === 'string' && typeof item.quantity === 'number')
    .map((item) => ({ partId: item.partId as string, quantity: item.quantity as number, notes: item.notes }));
  if (items.length === 0) {
    fail(res, 'items are required', 400);
    return;
  }
  try {
    const data = await createPurchaseRequest(buildContext(req), { items, notes: body.notes });
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
