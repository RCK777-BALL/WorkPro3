import { Response, NextFunction } from 'express';
import InventoryItem, { IInventoryItem } from '../models/InventoryItem';
import logger from '../utils/logger';
import mongoose from 'mongoose';
import type { AuthedRequest } from '../types/express';

function scopedQuery(req: AuthedRequest, base: any = {}) {
  const { tenantId, siteId } = req;
  if (tenantId) base.tenantId = tenantId;
  if (siteId) base.siteId = siteId;
  return base;
}

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
  'siteId',
  'sharedPartId',
] as const;

type AllowedField = (typeof ALLOWED_FIELDS)[number];

function buildInventoryPayload(body: Record<string, unknown>) {
  const invalid = Object.keys(body).filter(
    (key) => !ALLOWED_FIELDS.includes(key as AllowedField),
  );
  if (invalid.length) return { invalid };

  const data: Partial<IInventoryItem> = {};
  ALLOWED_FIELDS.forEach((key) => {
    if (body[key] !== undefined) (data as any)[key] = body[key];
  });
  return { data };
}

export const getInventoryItems = async (
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const query = scopedQuery(req);
    const items: IInventoryItem[] = await InventoryItem.find(query)
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

export const getAllInventoryItems = async (
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const query = scopedQuery(req);
    const items = await InventoryItem.find(query).lean();
    res.json(items);
  } catch (err) {
    next(err);
  }
};

export const getLowStockItems = async (
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const query: any = scopedQuery(req, {
      $expr: { $lte: ['$quantity', '$reorderThreshold'] },
    });

    const items = await InventoryItem.find(query).populate('vendor').lean();
    res.json(items);
  } catch (err) {
    next(err);
  }
};

export const getInventoryItemById = async (
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const item: IInventoryItem | null = await InventoryItem.findOne(
      scopedQuery(req, { _id: id })
    ).exec();

    if (!item) return res.status(404).json({ message: 'Not found' });

    const status = item.quantity <= (item.reorderThreshold ?? 0) ? 'low' : 'ok';
    res.json({ ...item.toObject(), status });
  } catch (err) {
    next(err);
  }
};

export const createInventoryItem = async (
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { data, invalid } = buildInventoryPayload(req.body as Record<string, unknown>);
    if (invalid) {
      return res
        .status(400)
        .json({ message: `Invalid fields: ${invalid.join(', ')}` });
    }

    const payload: Partial<IInventoryItem> = scopedQuery(req, data);

    const saved = await new InventoryItem(payload).save();
    res.status(201).json(saved);
  } catch (err) {
    logger.error('Error creating inventory item', err);
    next(err);
  }
};

export const updateInventoryItem = async (
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { data, invalid } = buildInventoryPayload(req.body as Record<string, unknown>);
    if (invalid) {
      return res
        .status(400)
        .json({ message: `Invalid fields: ${invalid.join(', ')}` });
    }
    const payload: Partial<IInventoryItem> = scopedQuery(req, data);

    const filter: any = scopedQuery(req, { _id: req.params.id });

    const updated = await InventoryItem.findOneAndUpdate(filter, payload, {
      new: true,
      runValidators: true,
    });

    if (!updated) return res.status(404).json({ message: 'Not found' });

    res.json(updated);
  } catch (err) {
    logger.error('Error updating inventory item', err);
    next(err);
  }
};

export const deleteInventoryItem = async (
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const filter: any = scopedQuery(req, { _id: req.params.id });

    const deleted = await InventoryItem.findOneAndDelete(filter);
    if (!deleted) return res.status(404).json({ message: 'Not found' });

    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    next(err);
  }
};

export const useInventoryItem = async (
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { quantity, uom } = req.body as { quantity?: number; uom?: string };

    if (!quantity || quantity <= 0)
      return res.status(400).json({ message: 'Quantity must be positive' });
    if (!uom)
      return res.status(400).json({ message: 'uom is required' });

    const filter: any = scopedQuery(req, { _id: req.params.id });

    const item = await InventoryItem.findOne(filter);
    if (!item) return res.status(404).json({ message: 'Not found' });

    try {
      await item.consume(quantity, new mongoose.Types.ObjectId(uom));
    } catch (err: any) {
      return res.status(400).json({ message: err.message });
    }

    res.json(item);
  } catch (err) {
    next(err);
  }
};

export const searchInventoryItems = async (
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const q = ((req.query.q as string) || '').trim();

    const regex = new RegExp(q, 'i');
    const filter: any = scopedQuery(req, {
      $or: [
        { name: { $regex: regex } },
        { sku: { $regex: regex } },
        { partNumber: { $regex: regex } },
      ],
    });

    const items = await InventoryItem.find(filter).limit(10).lean();
    res.json(items);
  } catch (err) {
    next(err);
  }
};
