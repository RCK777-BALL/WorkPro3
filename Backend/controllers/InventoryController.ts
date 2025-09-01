import { Request, Response, NextFunction, Express } from 'express';
import Inventory from '../models/Inventory';

export const getAllInventory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await Inventory.find();
    res.json(items);
  } catch (err) {
    next(err);
  }
};

export const getInventoryById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await Inventory.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json(item);
  } catch (err) {
    next(err);
  }
};

export const createInventory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if ((req as any).fileValidationError) {
    return res
      .status(400)
      .json({ message: (req as any).fileValidationError });
  }
  console.log('createInventory body:', req.body);
  console.log('createInventory files:', (req as any).files);
  const files = (req as any).files as Express.Multer.File[] | undefined;
  if (!files || files.length === 0) {
    console.log('No files uploaded for inventory');
  }

  const tenantId = (req as any).tenantId;
  if (!tenantId) {
    return res.status(400).json({ message: 'tenantId is required' });
  }

  const { name } = req.body as { [key: string]: any };
  if (!name) {
    return res.status(400).json({ message: 'name is required' });
  }

  const numericFields = [
    'quantity',
    'unitCost',
    'reorderPoint',
    'reorderThreshold',
  ] as const;

  for (const field of numericFields) {
    const value = (req.body as any)[field];
    if (value !== undefined) {
      const num = Number(value);
      if (isNaN(num)) {
        return res
          .status(400)
          .json({ message: `${field} must be a number` });
      }
      (req.body as any)[field] = num;
    }
  }

  try {
    const newItem = new Inventory(req.body);
    const saved = await newItem.save();
    res.status(201).json(saved);
  } catch (err) {
    next(err);
  }
};

export const updateInventory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if ((req as any).fileValidationError) {
    return res
      .status(400)
      .json({ message: (req as any).fileValidationError });
  }
  console.log('updateInventory body:', req.body);
  console.log('updateInventory files:', (req as any).files);
  const files = (req as any).files as Express.Multer.File[] | undefined;
  if (!files || files.length === 0) {
    console.log('No files uploaded for inventory update');
  }

  const tenantId = (req as any).tenantId;
  if (!tenantId) {
    return res.status(400).json({ message: 'tenantId is required' });
  }

  if (req.body.name !== undefined && !req.body.name) {
    return res.status(400).json({ message: 'name cannot be empty' });
  }

  const numericFields = [
    'quantity',
    'unitCost',
    'reorderPoint',
    'reorderThreshold',
  ] as const;

  for (const field of numericFields) {
    const value = (req.body as any)[field];
    if (value !== undefined) {
      const num = Number(value);
      if (isNaN(num)) {
        return res
          .status(400)
          .json({ message: `${field} must be a number` });
      }
      (req.body as any)[field] = num;
    }
  }

  try {
    const updated = await Inventory.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updated) return res.status(404).json({ message: 'Not found' });
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

export const deleteInventory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deleted = await Inventory.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    next(err);
  }
};

export const getLowStock = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const items = await Inventory.find({
      $expr: { $lte: ['$quantity', '$reorderThreshold'] },
    }).populate('vendor');
    res.json(items);
  } catch (err) {
    next(err);
  }
};
