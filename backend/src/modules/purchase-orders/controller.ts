/*
 * SPDX-License-Identifier: MIT
 */

import type { Response, NextFunction } from 'express';

import type { AuthedRequest, AuthedRequestHandler } from '../../../types/http';
import { fail } from '../../lib/http';
import {
  cancelPurchaseOrder,
  closePurchaseOrder,
  listPurchaseOrders,
  receivePurchaseOrder,
  savePurchaseOrder,
  sendPurchaseOrder,
  transitionPurchaseOrder,
  PurchaseOrderError,
  type PurchaseOrderContext,
} from './service';
import {
  purchaseOrderInputSchema,
  receivePurchaseOrderSchema,
  statusInputSchema,
} from './validation';

const ensureTenant = (req: AuthedRequest, res: Response): req is AuthedRequest & { tenantId: string } => {
  if (!req.tenantId) {
    fail(res, 'Tenant context is required', 400);
    return false;
  }
  return true;
};

const send = (res: Response, data: unknown, status = 200) => {
  res.status(status).json(data);
};

const handleError = (err: unknown, res: Response, next: NextFunction): void => {
  if (err instanceof PurchaseOrderError) {
    fail(res, err.message, err.status);
    return;
  }
  next(err);
};

const buildContext = (req: AuthedRequest): PurchaseOrderContext => ({
  tenantId: req.tenantId!,
  userId: (req.user as any)?._id?.toString() ?? (req.user as any)?.id,
  siteId: req.siteId,
});

export const listPurchaseOrdersHandler: AuthedRequestHandler = async (req, res, next) => {
  if (!ensureTenant(req, res)) return;
  try {
    const data = await listPurchaseOrders(buildContext(req));
    send(res, data);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const savePurchaseOrderHandler: AuthedRequestHandler<{ purchaseOrderId?: string }> = async (
  req,
  res,
  next,
) => {
  if (!ensureTenant(req, res)) return;
  const parse = purchaseOrderInputSchema.safeParse(req.body);
  if (!parse.success) {
    fail(res, parse.error.errors.map((error) => error.message).join(', '), 400);
    return;
  }
  try {
    const data = await savePurchaseOrder(buildContext(req), parse.data, req.params.purchaseOrderId);
    send(res, data, req.params.purchaseOrderId ? 200 : 201);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const transitionPurchaseOrderHandler: AuthedRequestHandler<{ purchaseOrderId: string }> = async (
  req,
  res,
  next,
) => {
  if (!ensureTenant(req, res)) return;
  const parse = statusInputSchema.safeParse(req.body);
  if (!parse.success) {
    fail(res, parse.error.errors.map((error) => error.message).join(', '), 400);
    return;
  }
  try {
    const data = await transitionPurchaseOrder(buildContext(req), req.params.purchaseOrderId, parse.data.status);
    send(res, data, 200);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const sendPurchaseOrderHandler: AuthedRequestHandler<{ purchaseOrderId: string }> = async (req, res, next) => {
  if (!ensureTenant(req, res)) return;
  try {
    const data = await sendPurchaseOrder(buildContext(req), req.params.purchaseOrderId, (req.body as any)?.note);
    send(res, data, 200);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const closePurchaseOrderHandler: AuthedRequestHandler<{ purchaseOrderId: string }> = async (req, res, next) => {
  if (!ensureTenant(req, res)) return;
  try {
    const data = await closePurchaseOrder(buildContext(req), req.params.purchaseOrderId);
    send(res, data, 200);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const cancelPurchaseOrderHandler: AuthedRequestHandler<{ purchaseOrderId: string }> = async (req, res, next) => {
  if (!ensureTenant(req, res)) return;
  try {
    const data = await cancelPurchaseOrder(buildContext(req), req.params.purchaseOrderId);
    send(res, data, 200);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const receivePurchaseOrderHandler: AuthedRequestHandler<{ purchaseOrderId: string }> = async (
  req,
  res,
  next,
) => {
  if (!ensureTenant(req, res)) return;
  const parse = receivePurchaseOrderSchema.safeParse(req.body);
  if (!parse.success) {
    fail(res, parse.error.errors.map((error) => error.message).join(', '), 400);
    return;
  }
  try {
    const data = await receivePurchaseOrder(buildContext(req), req.params.purchaseOrderId, parse.data.receipts);
    send(res, data, 200);
  } catch (err) {
    handleError(err, res, next);
  }
};
