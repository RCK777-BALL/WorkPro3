/*
 * SPDX-License-Identifier: MIT
 */

import { Request, Response, NextFunction } from 'express';
 
 
import InventoryItem, { IInventoryItem } from '../models/InventoryItem';
import logger from '../utils/logger';
import mongoose from 'mongoose';
import { logAudit } from '../utils/audit';

function scopedQuery(req: Request, base: any = {}) {
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
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<Response | void> => {
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
    return;
  } catch (err) {
    next(err);
    return;
  }
};

export const getAllInventoryItems = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<Response | void> => {
  try {
    const query = scopedQuery(req);
    const items = await InventoryItem.find(query).lean();
    res.json(items);
    return;
  } catch (err) {
    next(err);
    return;
  }
};

export const getLowStockItems = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<Response | void> => {
  try {
    const query: any = scopedQuery(req, {
      $expr: { $lte: ['$quantity', '$reorderThreshold'] },
    });

    const items = await InventoryItem.find(query).populate('vendor').lean();
    res.json(items);
    return;
  } catch (err) {
    next(err);
    return;
  }
};

export const getInventoryItemById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<Response | void> => {
  try {
    const { id } = req.params;
    const item: IInventoryItem | null = await InventoryItem.findOne(
      scopedQuery(req, { _id: id })
    ).exec();

    if (!item) {
      res.status(404).json({ message: 'Not found' });
      return;
    }

    const status = item.quantity <= (item.reorderThreshold ?? 0) ? 'low' : 'ok';
    res.json({ ...item.toObject(), status });
    return;
  } catch (err) {
    next(err);
    return;
  }
};

export const createInventoryItem = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<Response | void> => {
  try {
    const { data, invalid } = buildInventoryPayload(req.body as Record<string, unknown>);
    if (invalid) {
      res
        .status(400)
        .json({ message: `Invalid fields: ${invalid.join(', ')}` });
      return;
    }

    const payload: Partial<IInventoryItem> = scopedQuery(req, data);
    const saved = await new InventoryItem(payload).save();
    await logAudit(req, 'create', 'InventoryItem', saved._id, null, saved.toObject());
    res.status(201).json(saved);
    return;
  } catch (err) {
    logger.error('Error creating inventory item', err);
    next(err);
    return;
  }
};

export const updateInventoryItem = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<Response | void> => {
  try {
    const { data, invalid } = buildInventoryPayload(req.body as Record<string, unknown>);
    if (invalid) {
      res
        .status(400)
        .json({ message: `Invalid fields: ${invalid.join(', ')}` });
      return;
    }
    const payload: Partial<IInventoryItem> = scopedQuery(req, data);

    const filter: any = scopedQuery(req, { _id: req.params.id });

    const existing = await InventoryItem.findOne(filter);
    if (!existing) {
      res.status(404).json({ message: 'Not found' });
      return;
    }

    const updated = await InventoryItem.findOneAndUpdate(filter, payload, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      res.status(404).json({ message: 'Not found' });
      return;
    }

    await logAudit(
      req,
      'update',
      'InventoryItem',
      req.params.id,
      existing.toObject(),
      updated.toObject()
    );

    res.json(updated);
    return;
  } catch (err) {
    logger.error('Error updating inventory item', err);
    next(err);
    return;
  }
};

export const deleteInventoryItem = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<Response | void> => {
  try {
    const filter: any = scopedQuery(req, { _id: req.params.id });

    const deleted = await InventoryItem.findOneAndDelete(filter);
    if (!deleted) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    await logAudit(
      req,
      'delete',
      'InventoryItem',
      req.params.id,
      deleted.toObject(),
      null
    );

    res.json({ message: 'Deleted successfully' });
    return;
  } catch (err) {
    next(err);
    return;
  }
};

export const useInventoryItem = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<Response | void> => {
  try {
    const { quantity, uom } = req.body as { quantity?: number; uom?: string };

    if (!quantity || quantity <= 0) {
      res.status(400).json({ message: 'Quantity must be positive' });
      return;
    }
    if (!uom) {
      res.status(400).json({ message: 'uom is required' });
      return;
    }

    const filter: any = scopedQuery(req, { _id: req.params.id });

    const item = await InventoryItem.findOne(filter);
    if (!item) {
      res.status(404).json({ message: 'Not found' });
      return;
    }

    const before = item.toObject();
    try {
      await item.consume(quantity, new mongoose.Types.ObjectId(uom));
    } catch (err: any) {
      res.status(400).json({ message: err.message });
      return;
    }

    await logAudit(req, 'use', 'InventoryItem', req.params.id, before, item.toObject());

    res.json(item);
    return;
  } catch (err) {
    next(err);
    return;
  }
};

export const searchInventoryItems = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<Response | void> => {
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
    return;
  } catch (err) {
    next(err);
    return;
  }
};
