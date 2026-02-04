/*
 * SPDX-License-Identifier: MIT
 */

import type { Response } from 'express';
import type { AuthedRequest, AuthedRequestHandler } from '../../types/http';
import type {
  PurchaseOrderInput,
  PurchaseOrderUpdateInput,
} from '../../../shared/validators/purchaseOrder';
import {
  listPurchaseOrders,
  createPurchaseOrder,
  updatePurchaseOrder,
  receivePurchaseOrder,
  deletePurchaseOrder,
} from '../services/purchaseOrders.service';

type ReceivePurchaseOrderBody = {
  receipts?: Array<{ partId: string; quantity: number }>;
};

const ensureTenant = (req: AuthedRequest, res: Response): req is AuthedRequest & { tenantId: string } => {
  if (!req.tenantId) {
    res.status(401).json({ message: 'Missing tenant scope' });
    return false;
  }
  return true;
};

export const listPurchaseOrdersHandler: AuthedRequestHandler = async (req, res, next) => {
  try {
    if (!ensureTenant(req, res)) return;
    const query = {
      status: req.query.status as string | undefined,
      vendorId: req.query.vendorId as string | undefined,
      page: Number(req.query.page ?? 1),
      limit: Number(req.query.limit ?? 25),
    };
    const data = await listPurchaseOrders(req.tenantId, query);
    res.json(data);
  } catch (error) {
    next(error);
  }
};

export const createPurchaseOrderHandler: AuthedRequestHandler = async (req, res, next) => {
  try {
    if (!ensureTenant(req, res)) return;
    const po = await createPurchaseOrder(req.tenantId, req.body as PurchaseOrderInput);
    res.status(201).json(po);
  } catch (error) {
    next(error);
  }
};

export const updatePurchaseOrderHandler: AuthedRequestHandler<{ purchaseOrderId: string }> = async (req, res, next) => {
  try {
    if (!ensureTenant(req, res)) return;
    const po = await updatePurchaseOrder(
      req.tenantId,
      req.params.purchaseOrderId,
      req.body as PurchaseOrderUpdateInput,
    );
    if (!po) {
      res.status(404).json({ message: 'Purchase order not found' });
      return;
    }
    res.json(po);
  } catch (error) {
    next(error);
  }
};

export const receivePurchaseOrderHandler: AuthedRequestHandler<
  { purchaseOrderId: string },
  unknown,
  ReceivePurchaseOrderBody
> = async (req, res, next) => {
  try {
    if (!ensureTenant(req, res)) return;
    const { receipts = [] } = req.body as ReceivePurchaseOrderBody;
    const po = await receivePurchaseOrder(req.tenantId, req.params.purchaseOrderId, receipts);
    if (!po) {
      res.status(404).json({ message: 'Purchase order not found' });
      return;
    }
    res.json(po);
  } catch (error) {
    next(error);
  }
};

export const deletePurchaseOrderHandler: AuthedRequestHandler<{ purchaseOrderId: string }> = async (req, res, next) => {
  try {
    if (!ensureTenant(req, res)) return;
    await deletePurchaseOrder(req.tenantId, req.params.purchaseOrderId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
