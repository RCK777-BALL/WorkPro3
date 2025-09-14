/*
 * SPDX-License-Identifier: MIT
 */

import type { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import InventoryItem, { type IInventoryItem } from "../models/InventoryItem";
import logger from "../utils/logger";
import { writeAuditLog } from "../utils/audit";

const { isValidObjectId, Types } = mongoose;

// Narrow helper to scope queries by tenant/site
function scopedQuery<T extends Record<string, unknown>>(req: Request, base?: T) {
  const q: Record<string, unknown> = { ...(base ?? {}) };
  if (req.tenantId) q.tenantId = req.tenantId;
  if (req.siteId) q.siteId = req.siteId;
  return q as T & { tenantId?: string; siteId?: string };
}

const ALLOWED_FIELDS = [
  "tenantId",
  "name",
  "description",
  "partNumber",
  "sku",
  "category",
  "quantity",
  "unitCost",
  "unit",
  "location",
  "minThreshold",
  "reorderThreshold",
  "reorderPoint",
  "lastRestockDate",
  "lastOrderDate",
  "vendor",
  "asset",
  "image",
  "siteId",
  "sharedPartId",
] as const;

type AllowedField = (typeof ALLOWED_FIELDS)[number];

function buildInventoryPayload(body: Record<string, unknown>) {
  const invalid = Object.keys(body).filter(
    (key) => !ALLOWED_FIELDS.includes(key as AllowedField),
  );
  if (invalid.length) return { invalid };

  const data: Partial<IInventoryItem> = {};

  // Optional light coercions for numerics/dates
  const numKeys = new Set(["quantity", "unitCost", "minThreshold", "reorderThreshold", "reorderPoint"]);
  const dateKeys = new Set(["lastRestockDate", "lastOrderDate"]);

  for (const key of ALLOWED_FIELDS) {
    const v = body[key as string];
    if (v === undefined) continue;

    if (numKeys.has(key) && v !== null) {
      const n = typeof v === "number" ? v : Number(v);
      if (!Number.isFinite(n)) continue;
      (data as any)[key] = n;
      continue;
    }
    if (dateKeys.has(key) && typeof v === "string") {
      const d = new Date(v);
      if (!Number.isNaN(d.valueOf())) (data as any)[key] = d;
      continue;
    }
    (data as any)[key] = v;
  }

  return { data };
}

// —— GET /inventory/summary (name, stock, status) ————————————————————————
export const getInventoryItems = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = scopedQuery(req);
    const items = await InventoryItem.find(query)
      .select({ name: 1, quantity: 1, reorderThreshold: 1 })
      .lean();

    const formatted = items.map((item) => {
      const qty = Number(item.quantity ?? 0);
      const threshold = Number(item.reorderThreshold ?? 0);
      return {
        name: item.name,
        stock: qty,
        status: qty <= threshold ? "low" : "ok",
      };
    });

    res.json(formatted);
  } catch (err) {
    next(err);
  }
};

// —— GET /inventory ————————————————————————————————————————————————
export const getAllInventoryItems = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = scopedQuery(req);
    const items = await InventoryItem.find(query).lean();
    res.json(items);
  } catch (err) {
    next(err);
  }
};

// —— GET /inventory/low-stock ————————————————————————————————————————
export const getLowStockItems = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = scopedQuery(req, {
      $expr: { $lte: ["$quantity", { $ifNull: ["$reorderThreshold", 0] }] },
    } as any);

    const items = await InventoryItem.find(query).populate("vendor").lean();
    res.json(items);
  } catch (err) {
    next(err);
  }
};

// —— GET /inventory/:id ———————————————————————————————————————————————
export const getInventoryItemById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      res.status(400).json({ message: "Invalid id" });
      return;
    }

    const item = await InventoryItem.findOne(scopedQuery(req, { _id: id })).exec();
    if (!item) {
      res.status(404).json({ message: "Not found" });
      return;
    }

    const qty = Number(item.quantity ?? 0);
    const threshold = Number(item.reorderThreshold ?? 0);
    res.json({ ...item.toObject(), status: qty <= threshold ? "low" : "ok" });
  } catch (err) {
    next(err);
  }
};

// —— POST /inventory ————————————————————————————————————————————————
export const createInventoryItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId)
      return res.status(400).json({ message: 'Tenant ID required' });
    const { data, invalid } = buildInventoryPayload(req.body as Record<string, unknown>);
    if (invalid) {
      res.status(400).json({ message: `Invalid fields: ${invalid.join(", ")}` });
      return;
    }

    const payload: Partial<IInventoryItem> = scopedQuery(req, data);
    const saved = await new InventoryItem(payload).save();
    const userId = (req.user as any)?._id || (req.user as any)?.id;
    await writeAuditLog({
      tenantId,
      userId,
      action: "create",
      entityType: "InventoryItem",
      entityId: saved._id,
      after: saved.toObject(),
    });
    res.status(201).json(saved);
  } catch (err) {
    logger.error("Error creating inventory item", err);
    next(err);
  }
};

// —— PATCH /inventory/:id ———————————————————————————————————————————————
export const updateInventoryItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId)
      return res.status(400).json({ message: 'Tenant ID required' });
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      res.status(400).json({ message: "Invalid id" });
      return;
    }

    const { data, invalid } = buildInventoryPayload(req.body as Record<string, unknown>);
    if (invalid) {
      res.status(400).json({ message: `Invalid fields: ${invalid.join(", ")}` });
      return;
    }

    const filter = scopedQuery(req, { _id: id } as any);
    const existing = await InventoryItem.findOne(filter);
    if (!existing) {
      res.status(404).json({ message: "Not found" });
      return;
    }

    const updated = await InventoryItem.findOneAndUpdate(filter, data, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      res.status(404).json({ message: "Not found" });
      return;
    }

    const userId2 = (req.user as any)?._id || (req.user as any)?.id;
    await writeAuditLog({
      tenantId,
      userId: userId2,
      action: "update",
      entityType: "InventoryItem",
      entityId: new Types.ObjectId(id),
      before: existing.toObject(),
      after: updated.toObject(),
    });
    res.json(updated);
  } catch (err) {
    logger.error("Error updating inventory item", err);
    next(err);
  }
};

// —— DELETE /inventory/:id ——————————————————————————————————————————————
export const deleteInventoryItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId)
      return res.status(400).json({ message: 'Tenant ID required' });
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      res.status(400).json({ message: "Invalid id" });
      return;
    }

    const filter = scopedQuery(req, { _id: id } as any);
    const deleted = await InventoryItem.findOneAndDelete(filter);
    if (!deleted) {
      res.status(404).json({ message: "Not found" });
      return;
    }

    const userId3 = (req.user as any)?._id || (req.user as any)?.id;
    await writeAuditLog({
      tenantId,
      userId: userId3,
      action: "delete",
      entityType: "InventoryItem",
      entityId: new Types.ObjectId(id),
      before: deleted.toObject(),
    });
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    next(err);
  }
};

// —— POST /inventory/:id/use ————————————————————————————————————————————
export const useInventoryItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId)
      return res.status(400).json({ message: 'Tenant ID required' });
    const { id } = req.params;
    const { quantity, uom } = req.body as { quantity?: number; uom?: string };

    if (!isValidObjectId(id)) {
      res.status(400).json({ message: "Invalid id" });
      return;
    }
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      res.status(400).json({ message: "Quantity must be a positive number" });
      return;
    }
    if (!uom || !isValidObjectId(uom)) {
      res.status(400).json({ message: "uom must be a valid ObjectId" });
      return;
    }

    const item = await InventoryItem.findOne(scopedQuery(req, { _id: id } as any));
    if (!item) {
      res.status(404).json({ message: "Not found" });
      return;
    }

    const before = item.toObject();

    // If model types don’t declare .consume, call with a local narrow type
    const doc = item as typeof item & {
      consume?: (q: number, uomId: mongoose.Types.ObjectId) => Promise<void>;
    };

    if (typeof doc.consume !== "function") {
      res.status(400).json({ message: "Consume operation not supported for this item" });
      return;
    }

    try {
      await doc.consume(qty, new Types.ObjectId(uom));
    } catch (e: any) {
      res.status(400).json({ message: e?.message ?? "Failed to consume item" });
      return;
    }

    const userId4 = (req.user as any)?._id || (req.user as any)?.id;
    await writeAuditLog({
      tenantId,
      userId: userId4,
      action: "use",
      entityType: "InventoryItem",
      entityId: new Types.ObjectId(id),
      before,
      after: item.toObject(),
    });
    res.json(item);
  } catch (err) {
    next(err);
  }
};

// —— GET /inventory/search?q= ————————————————————————————————————————————
export const searchInventoryItems = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = String((req.query.q as string) ?? "").trim();
    if (!q) {
      res.json([]);
      return;
    }

    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const filter = scopedQuery(req, {
      $or: [{ name: regex }, { sku: regex }, { partNumber: regex }],
    } as any);

    const items = await InventoryItem.find(filter).limit(10).lean();
    res.json(items);
  } catch (err) {
    next(err);
  }
};
