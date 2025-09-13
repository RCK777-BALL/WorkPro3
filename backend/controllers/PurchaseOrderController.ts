/*
 * SPDX-License-Identifier: MIT
 */

import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';

import PurchaseOrder from '../models/PurchaseOrder';
import { writeAuditLog } from '../utils/audit';

const { Types, isValidObjectId } = mongoose;

export const createPurchaseOrder = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<Response | void> => {
  try {
    const tenantId = req.tenantId;
    const po = await PurchaseOrder.create({
      ...req.body,
      ...(tenantId ? { tenantId } : {}),
    });
    const userId = (req.user as any)?._id || (req.user as any)?.id;
    const entityId = new Types.ObjectId(po._id);
    await writeAuditLog({
      tenantId,
      userId,
      action: 'create',
      entityType: 'PurchaseOrder',
      entityId,
      after: po.toObject(),
    });
    res.status(201).json(po);
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
      res.status(400).json({ message: 'Invalid id' });
      return;
    }
    const po = await PurchaseOrder.findById(id).lean();
    if (!po) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    res.json(po);
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
    res.json(pos);
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
      res.status(400).json({ message: 'Invalid status' });
      return;
    }
    if (!isValidObjectId(id)) {
      res.status(400).json({ message: 'Invalid id' });
      return;
    }
    const po = await PurchaseOrder.findById(id);
    if (!po) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    if (po.vendor.toString() !== vendorId) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }
    const before = po.toObject();
    po.status = status as any;
    await po.save();
    const userId = (req.user as any)?._id || (req.user as any)?.id;
    const entityId = new Types.ObjectId(id);
    await writeAuditLog({
      tenantId: po.tenantId,
      userId,
      action: 'update',
      entityType: 'PurchaseOrder',
      entityId,
      before,
      after: po.toObject(),
    });
    res.json(po);
    return;
  } catch (err) {
    next(err);
    return;
  }
};
