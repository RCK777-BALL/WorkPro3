/*
 * SPDX-License-Identifier: MIT
 */

import { Request, Response, NextFunction } from 'express';
import { Types, isValidObjectId } from 'mongoose';

import PurchaseOrder from '../models/PurchaseOrder';
import StockHistory from '../models/StockHistory';
import StockItem from '../models/StockItem';
import { writeAuditLog } from '../utils/audit';
import { sendResponse } from '../utils/sendResponse';

const toPlainObject = (value: unknown): Record<string, unknown> | undefined => {
  if (!value) return undefined;
  if (typeof value === 'object' && typeof (value as any).toObject === 'function') {
    return (value as any).toObject();
  }
  if (typeof value === 'object') {
    return value as Record<string, unknown>;
  }
  return undefined;
};

export const createPurchaseOrder = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<Response | void> => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId)
      return sendResponse(res, null, 'Tenant ID required', 400);
    const po = await PurchaseOrder.create({
      ...req.body,
      status: 'Draft',
      tenantId,
    });
    const userId = (req.user as any)?._id || (req.user as any)?.id;
    const entityId = po._id as Types.ObjectId;
    await writeAuditLog({
      tenantId,
      userId,
      action: 'create',
      entityType: 'PurchaseOrder',
      entityId,
      after: toPlainObject(po),
    });
    sendResponse(res, po, null, 201);
    return;
  } catch (err) {
    next(err);
    return;
  }
};

export const getPurchaseOrder = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<Response | void> => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      sendResponse(res, null, 'Invalid id', 400);
      return;
    }
    const objectId = new Types.ObjectId(id);
    const po = await PurchaseOrder.findOne({ _id: objectId, tenantId: req.tenantId }).lean();
    if (!po) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    sendResponse(res, po);
    return;
  } catch (err) {
    next(err);
    return;
  }
};

export const listVendorPurchaseOrders = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<Response | void> => {
  try {
    const vendorId = req.vendorId;
    const pos = await PurchaseOrder.find({ vendor: vendorId }).lean();
    sendResponse(res, pos);
    return;
  } catch (err) {
    next(err);
    return;
  }
};

export const listPurchaseOrders = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<Response | void> => {
  try {
    if (!req.tenantId) {
      return sendResponse(res, null, 'Tenant ID required', 400);
    }
    const orders = await PurchaseOrder.find({ tenantId: req.tenantId }).lean();
    sendResponse(res, orders);
    return;
  } catch (err) {
    next(err);
    return;
  }
};

export const updatePurchaseOrderStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<Response | void> => {
  try {
    const { id } = req.params;
    const { status } = req.body as { status: string };
    if (!isValidObjectId(id)) {
      sendResponse(res, null, 'Invalid id', 400);
      return;
    }
    const allowed = ['Draft', 'Pending', 'Approved', 'Ordered', 'Received', 'Closed'];
    if (!allowed.includes(status)) {
      sendResponse(res, null, 'Invalid status', 400);
      return;
    }
    const po = await PurchaseOrder.findOne({ _id: new Types.ObjectId(id), tenantId: req.tenantId });
    if (!po) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    const before = toPlainObject(po);
    (po as any).status = status as any;
    await po.save();
    await writeAuditLog({
      tenantId: req.tenantId!,
      userId: (req.user as any)?._id,
      action: 'update',
      entityType: 'PurchaseOrder',
      entityId: po._id,
      before,
      after: toPlainObject(po),
    });
    sendResponse(res, po);
    return;
  } catch (err) {
    next(err);
    return;
  }
};

export const receivePurchaseOrder = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<Response | void> => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      sendResponse(res, null, 'Invalid id', 400);
      return;
    }
    const po = await PurchaseOrder.findOne({ _id: new Types.ObjectId(id), tenantId: req.tenantId });
    if (!po) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    const receipts = (req.body as any).receipts ?? [];
    receipts.forEach((line: any) => {
      const target = (po as any).lines.find((l: any) => l._id?.toString() === line.lineId || l.part?.toString() === line.partId);
      if (!target) return;
      target.qtyReceived = Math.min((target.qtyReceived ?? 0) + Number(line.qty ?? 0), target.qtyOrdered ?? 0);
    });
    (po as any).status = (po as any).lines.every((l: any) => (l.qtyReceived ?? 0) >= (l.qtyOrdered ?? 0))
      ? 'Received'
      : 'Ordered';
    await po.save();

    await Promise.all(
      ((po as any).lines ?? []).map(async (line: any) => {
        if (!line.part) return;
        const stock = await StockItem.findOne({ tenantId: po.tenantId, part: line.part });
        if (!stock) return;
        stock.quantity = Number(stock.quantity ?? 0) + Number(line.qtyReceived ?? 0);
        await stock.save();
        await StockHistory.create({
          tenantId: po.tenantId,
          siteId: po.siteId,
          stockItem: stock._id,
          part: stock.part,
          delta: Number(line.qtyReceived ?? 0),
          reason: `PO ${po.poNumber ?? po._id} receipt`,
          userId: (req.user as any)?._id,
          balance: stock.quantity,
        });
      }),
    );
    sendResponse(res, po);
    return;
  } catch (err) {
    next(err);
    return;
  }
};

export const updateVendorPurchaseOrder = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<Response | void> => {
  try {
    const vendorId = req.vendorId as string;
    const { id } = req.params;
    const { status } = req.body as { status: string };
    const allowed = ['acknowledged', 'shipped'];
    if (!allowed.includes(status)) {
      sendResponse(res, null, 'Invalid status', 400);
      return;
    }
    if (!isValidObjectId(id)) {
      sendResponse(res, null, 'Invalid id', 400);
      return;
    }
    const objectId = new Types.ObjectId(id);
    const po = await PurchaseOrder.findById(objectId);
    if (!po) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    if (po.vendor.toString() !== vendorId) {
      sendResponse(res, null, 'Forbidden', 403);
      return;
    }
    const before = toPlainObject(po);
    po.status = status as any;
    await po.save();
    const userId = (req.user as any)?._id || (req.user as any)?.id;
    const entityId = objectId;
    await writeAuditLog({
      tenantId: po.tenantId,
      userId,
      action: 'update',
      entityType: 'PurchaseOrder',
      entityId,
      before,
      after: toPlainObject(po),
    });
    sendResponse(res, po);
    return;
  } catch (err) {
    next(err);
    return;
  }
};
