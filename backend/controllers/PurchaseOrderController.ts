/*
 * SPDX-License-Identifier: MIT
 */

import { Request, Response, NextFunction } from 'express';
import { Types, isValidObjectId } from 'mongoose';

import PurchaseOrder from '../models/PurchaseOrder';
import { writeAuditLog } from '../utils/audit';
import { sendResponse } from '../utils/sendResponse';

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
      after: po.toObject(),
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
    const before = po.toObject();
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
      after: po.toObject(),
    });
    sendResponse(res, po);
    return;
  } catch (err) {
    next(err);
    return;
  }
};
