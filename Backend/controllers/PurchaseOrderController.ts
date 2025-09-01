import { Request, Response, NextFunction } from 'express';
import PurchaseOrder from '../models/PurchaseOrder';

export const createPurchaseOrder = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const tenantId = (req as any).tenantId as string | undefined;
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
  req: Request,
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
