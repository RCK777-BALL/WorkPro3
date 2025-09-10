import { Response, NextFunction } from 'express';
import PurchaseOrder from '../models/PurchaseOrder';
import type { AuthedRequest } from '../types/express';

export const createPurchaseOrder = async (
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const tenantId = req.tenantId;
    const po = await PurchaseOrder.create({
      ...req.body,
      ...(tenantId ? { tenantId } : {}),
    });
    res.status(201).json(po);
  } catch (err) {
    next(err);
  }
};

export const getPurchaseOrder = async (
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const po = await PurchaseOrder.findById(id).lean();
    if (!po) return res.status(404).json({ message: 'Not found' });
    res.json(po);
  } catch (err) {
    next(err);
  }
};

export const listVendorPurchaseOrders = async (
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const vendorId = req.vendorId;
    const pos = await PurchaseOrder.find({ vendor: vendorId }).lean();
    res.json(pos);
  } catch (err) {
    next(err);
  }
};

export const updateVendorPurchaseOrder = async (
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const vendorId = req.vendorId as string;
    const { id } = req.params;
    const { status } = req.body as { status: string };
    const allowed = ['acknowledged', 'shipped'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    const po = await PurchaseOrder.findById(id);
    if (!po) return res.status(404).json({ message: 'Not found' });
    if (po.vendor.toString() !== vendorId) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    po.status = status as any;
    await po.save();
    res.json(po);
  } catch (err) {
    next(err);
  }
};
