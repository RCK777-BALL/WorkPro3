import { Request, Response, NextFunction } from 'express';
import InventoryItem, { IInventoryItem } from '../models/InventoryItem';

const ALLOWED_FIELDS = [
  'tenantId',
  'name',
  'description',
  'partNumber',
  'sku',
  'category',
  'quantity',
  'unitCost',
  'unit',
  'location',
  'minThreshold',
  'reorderThreshold',
  'reorderPoint',
  'lastRestockDate',
  'lastOrderDate',
  'vendor',
  'asset',
  'image',
] as const;

type AllowedField = (typeof ALLOWED_FIELDS)[number];

function buildInventoryPayload(body: Record<string, unknown>) {
  const invalid = Object.keys(body).filter(
    (key) => !ALLOWED_FIELDS.includes(key as AllowedField),
  );
  if (invalid.length) {
    return { invalid };
  }
  const data: Partial<IInventoryItem> = {};
  ALLOWED_FIELDS.forEach((key) => {
    if (body[key] !== undefined) {
      (data as any)[key] = body[key];
    }
  });
  return { data };
}


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
    const { data, invalid } = buildInventoryPayload(req.body as Record<string, unknown>);
    if (invalid) {
      return res.status(400).json({ message: `Invalid fields: ${invalid.join(', ')}` });
    }
    const newItem = new InventoryItem(data);
    const saved = await newItem.save();

    res.status(201).json(saved);
  } catch (err) {
    next(err);
  }
};

export const updateInventoryItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, invalid } = buildInventoryPayload(req.body as Record<string, unknown>);
    if (invalid) {
      return res.status(400).json({ message: `Invalid fields: ${invalid.join(', ')}` });
    }
    const updated = await InventoryItem.findByIdAndUpdate(
      req.params.id,
      data,
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ message: 'Not found' });

    res.json(updated);
  } catch (err) {
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
