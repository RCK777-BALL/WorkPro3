/*
 * SPDX-License-Identifier: MIT
 */

import type { NextFunction, Response } from 'express';
import { z } from 'zod';

import type { AuthedRequest, AuthedRequestHandler } from '../../../types/http';
import {
  createPurchaseOrder,
  listPurchaseOrders,
  receivePurchaseOrder,
  sendPurchaseOrder,
  type PurchasingInput,
} from './service';

const objectId = z.string().min(1, 'Identifier is required');
const purchaseOrderInputSchema = z.object({
  vendorId: objectId,
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        partId: objectId,
        quantity: z.number().positive('Quantity must be positive'),
        unitCost: z.number().optional(),
      }),
    )
    .min(1, 'At least one item is required'),
});

const ensureTenant = (req: AuthedRequest, res: Response): req is AuthedRequest & { tenantId: string } => {
  if (!req.tenantId) {
    res.status(400).json({ error: 'Tenant context required' });
    return false;
  }
  return true;
};

const handleError = (error: unknown, res: Response, next: NextFunction) => {
  if (error instanceof Error) {
    res.status(400).json({ error: error.message });
    return;
  }
  next(error);
};

const buildContext = (req: AuthedRequest) => {
  const userId =
    typeof req.user?._id === 'string'
      ? req.user._id
      : typeof req.user?.id === 'string'
        ? req.user.id
        : undefined;
  return {
    tenantId: req.tenantId!,
    userId,
  };
};

export const listPurchasingOrdersHandler: AuthedRequestHandler = async (req, res, next) => {
  if (!ensureTenant(req, res)) return;
  try {
    const data = await listPurchaseOrders(buildContext(req));
    res.json(data);
  } catch (error) {
    handleError(error, res, next);
  }
};

export const createPurchasingOrderHandler: AuthedRequestHandler = async (req, res, next) => {
  if (!ensureTenant(req, res)) return;
  const parsed = purchaseOrderInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    const payload = parsed.data as PurchasingInput;
    const data = await createPurchaseOrder(buildContext(req), payload);
    res.status(201).json(data);
  } catch (error) {
    handleError(error, res, next);
  }
};

export const sendPurchasingOrderHandler: AuthedRequestHandler<{ orderId: string }> = async (req, res, next) => {
  if (!ensureTenant(req, res)) return;
  try {
    const data = await sendPurchaseOrder(buildContext(req), req.params.orderId);
    res.json(data);
  } catch (error) {
    handleError(error, res, next);
  }
};

export const receivePurchasingOrderHandler: AuthedRequestHandler<{ orderId: string }> = async (req, res, next) => {
  if (!ensureTenant(req, res)) return;
  try {
    const data = await receivePurchaseOrder(buildContext(req), req.params.orderId);
    res.json(data);
  } catch (error) {
    handleError(error, res, next);
  }
};
