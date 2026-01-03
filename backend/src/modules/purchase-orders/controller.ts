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

const buildContext = (req: AuthedRequest): PurchaseOrderContext => {
  const userId =
    typeof req.user?._id === 'string'
      ? req.user._id
      : typeof req.user?.id === 'string'
        ? req.user.id
        : undefined;
  return {
    tenantId: req.tenantId!,
    userId,
    siteId: req.siteId,
  };
};

export const listPurchaseOrdersHandler: AuthedRequestHandler = async (req, res, next) => {
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
  try {
    const note = typeof (req.body as { note?: unknown })?.note === 'string' ? (req.body as { note?: string }).note : undefined;
    const data = await sendPurchaseOrder(buildContext(req), req.params.purchaseOrderId, note);
    send(res, data, 200);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const closePurchaseOrderHandler: AuthedRequestHandler<{ purchaseOrderId: string }> = async (req, res, next) => {
  try {
    const data = await closePurchaseOrder(buildContext(req), req.params.purchaseOrderId);
    send(res, data, 200);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const cancelPurchaseOrderHandler: AuthedRequestHandler<{ purchaseOrderId: string }> = async (req, res, next) => {
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
