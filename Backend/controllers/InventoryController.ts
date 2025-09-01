import { Request, Response, NextFunction } from 'express';
import InventoryItem, { IInventoryItem } from '../models/InventoryItem';
import logger from '../utils/logger';


export const getInventoryItems = async (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const items: IInventoryItem[] = await InventoryItem.find()
      .select('name quantity reorderThreshold')
      .lean();

    const formatted = items.map((item) => ({
      name: item.name,
      stock: item.quantity,
      status: item.quantity <= (item.reorderThreshold ?? 0) ? 'low' : 'ok',
    }));
 
 

    res.json(formatted);
  } catch (err) {
    next(err);
  }
};

export const getAllInventoryItems = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await InventoryItem.find();
    res.json(items);
  } catch (err) {
    next(err);
  }
};

export const getLowStockItems = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await InventoryItem.find({ $expr: { $lte: ["$quantity", "$reorderThreshold"] } }).populate('vendor');
    res.json(items);
  } catch (err) {
    next(err);
  }
};

export const getInventoryItemById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const tenantId = (req as any).tenantId;
    const item: IInventoryItem | null = await InventoryItem.findOne({
      _id: id,
      tenantId,
    }).exec();
    if (!item) return res.status(404).json({ message: 'Not found' });
    const status = item.quantity <= (item.reorderThreshold ?? 0) ? 'low' : 'ok';
    res.json({ ...item.toObject(), status });
  } catch (err) {
    next(err);
  }
};

export const createInventoryItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    logger.debug('createInventoryItem body:', req.body);
    const newItem = new InventoryItem(req.body);
    const saved = await newItem.save();

    res.status(201).json(saved);
  } catch (err) {
    logger.error('Error creating inventory item', err);
    next(err);
  }
};

export const updateInventoryItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    logger.debug('updateInventoryItem body:', req.body);
    const updated = await InventoryItem.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ message: 'Not found' });

    res.json(updated);
  } catch (err) {
    logger.error('Error updating inventory item', err);
    next(err);
  }
};

export const deleteInventoryItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deleted = await InventoryItem.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Not found' });

    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    next(err);
  }
};

export const searchInventoryItems = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const q = (req.query.q as string) || '';
    const regex = new RegExp(q, 'i');
    const items = await InventoryItem.find({ name: { $regex: regex } }).limit(10);
    res.json(items);
  } catch (err) {
    next(err);
  }
};
