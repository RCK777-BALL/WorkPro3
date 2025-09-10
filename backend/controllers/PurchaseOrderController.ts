import { Request, Response, NextFunction } from 'express';
 
import PurchaseOrder from '../models/PurchaseOrder';

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
    const po = await PurchaseOrder.findById(id);
    if (!po) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    if (po.vendor.toString() !== vendorId) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }
    po.status = status as any;
    await po.save();
    res.json(po);
    return;
  } catch (err) {
    next(err);
    return;
  }
};
