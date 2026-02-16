/*
 * SPDX-License-Identifier: MIT
 */

import type { Request, Response, NextFunction } from "express";
import { Types, isValidObjectId } from "mongoose";
import InventoryItem, { type IInventoryItem } from "../models/InventoryItem";
import { ensureQrCode, generateQrCodeValue } from "../services/qrCode";
import { notifyLowStock } from "../services/notificationService";
import { logger, auditAction, toEntityId, sendResponse } from '../utils';

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

type InventorySummaryProjection = Pick<IInventoryItem, "name" | "quantity" | "reorderThreshold">;

const toPlainObject = <T>(value: unknown): T => {
  if (value && typeof (value as any).toObject === "function") {
    return (value as any).toObject() as T;
  }
  if (value && typeof value === "object") {
    return value as T;
  }
  return {} as T;
};

// —— GET /inventory/summary (name, stock, status) ————————————————————————
export async function getInventoryItems(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = scopedQuery(req);
    const summaryQuery = InventoryItem.find(query);
    summaryQuery.select({ name: 1, quantity: 1, reorderThreshold: 1 });
    summaryQuery.lean<InventorySummaryProjection>();
    const items = await summaryQuery.exec();

    const formatted = items.map((item: InventorySummaryProjection) => {
      const qty = Number(item.quantity ?? 0);
      const threshold = Number(item.reorderThreshold ?? 0);
      return {
        name: item.name,
        stock: qty,
        status: qty <= threshold ? "low" : "ok",
      };
    });

    sendResponse(res, formatted);
  } catch (err) {
    next(err);
    return;
  }
}

// —— GET /inventory ————————————————————————————————————————————————
export async function getAllInventoryItems(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = scopedQuery(req);
    const itemsQuery = InventoryItem.find(query);
    itemsQuery.lean<IInventoryItem>();
    const items = await itemsQuery.exec();
    const withQr = items.map((item) => ensureQrCode(item as IInventoryItem, 'part'));
    sendResponse(res, withQr);
  } catch (err) {
    next(err);
    return;
  }
}

// —— GET /inventory/low-stock ————————————————————————————————————————
export async function getLowStockItems(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = scopedQuery(req, {
      $expr: { $lte: ["$quantity", { $ifNull: ["$reorderThreshold", 0] }] },
    } as any);

    const itemsQuery = InventoryItem.find(query);
    itemsQuery.populate("vendor");
    const items = await itemsQuery.exec();
    const withQr = items.map((item) => ensureQrCode(toPlainObject<IInventoryItem>(item), 'part'));
    sendResponse(res, withQr);
  } catch (err) {
    next(err);
    return;
  }
}

// —— GET /inventory/:id ———————————————————————————————————————————————
export async function getInventoryItemById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      sendResponse(res, null, "Invalid id", 400);
      return;
    }

    const itemQuery = InventoryItem.findOne(scopedQuery(req, { _id: id }));
    const item = await itemQuery.exec();
    if (!item) {
      sendResponse(res, null, "Not found", 404);
      return;
    }

    const qty = Number(item.quantity ?? 0);
    const threshold = Number(item.reorderThreshold ?? 0);
    const plainItem = toPlainObject<IInventoryItem>(item);
    const withQr = ensureQrCode(plainItem, 'part');
    sendResponse(res, { ...withQr, status: qty <= threshold ? "low" : "ok" });
  } catch (err) {
    next(err);
    return;
  }
}

// —— POST /inventory ————————————————————————————————————————————————
export async function createInventoryItem(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = req.tenantId;
    if (!tenantId)
      return sendResponse(res, null, 'Tenant ID required', 400);
    const { data, invalid } = buildInventoryPayload(req.body as Record<string, unknown>);
    if (invalid) {
      sendResponse(res, null, `Invalid fields: ${invalid.join(", ")}`, 400);
      return;
    }

    const payload: Partial<IInventoryItem> = scopedQuery(req, data);
    const saved = await new InventoryItem(payload).save();
    const qrCode = generateQrCodeValue({
      type: 'part',
      id: saved._id.toString(),
      tenantId: saved.tenantId?.toString?.(),
    });
    if (!saved.qrCode || saved.qrCode !== qrCode) {
      saved.qrCode = qrCode;
      await saved.save();
    }
    const savedPlain = toPlainObject(saved);
    await auditAction(req, "create", "InventoryItem", toEntityId(saved._id) ?? saved._id, undefined, savedPlain);
    await notifyLowStock(saved);
    sendResponse(res, saved, null, 201);
  } catch (err) {
    logger.error("Error creating inventory item", err);
    next(err);
    return;
  }
}

// —— PATCH /inventory/:id ———————————————————————————————————————————————
export async function updateInventoryItem(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = req.tenantId;
    if (!tenantId)
      return sendResponse(res, null, 'Tenant ID required', 400);
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      sendResponse(res, null, "Invalid id", 400);
      return;
    }

    const { data, invalid } = buildInventoryPayload(req.body as Record<string, unknown>);
    if (invalid) {
      sendResponse(res, null, `Invalid fields: ${invalid.join(", ")}`, 400);
      return;
    }

    const filter = scopedQuery(req, { _id: id } as any);
    const existingQuery = InventoryItem.findOne(filter);
    const existing = await existingQuery.exec();
    if (!existing) {
      sendResponse(res, null, "Not found", 404);
      return;
    }

    const updateQuery = InventoryItem.findOneAndUpdate(filter, data, {
      returnDocument: 'after',
      runValidators: true,
    });
    if (updateQuery.getUpdate()) {
      (updateQuery.getUpdate() as Record<string, unknown>).qrCode = generateQrCodeValue({
        type: 'part',
        id,
        tenantId: tenantId.toString(),
      });
    }
    const updated = await updateQuery.exec();

    if (!updated) {
      sendResponse(res, null, "Not found", 404);
      return;
    }

    const before = toPlainObject(existing);
    const after = toPlainObject(updated);
    await auditAction(req, "update", "InventoryItem", toEntityId(id) ?? id, before, after);
    await notifyLowStock(updated);
    sendResponse(res, updated);
  } catch (err) {
    logger.error("Error updating inventory item", err);
    next(err);
    return;
  }
}

// —— DELETE /inventory/:id ——————————————————————————————————————————————
export async function deleteInventoryItem(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = req.tenantId;
    if (!tenantId)
      return sendResponse(res, null, 'Tenant ID required', 400);
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      sendResponse(res, null, "Invalid id", 400);
      return;
    }

    const filter = scopedQuery(req, { _id: id } as any);
    const deleteQuery = InventoryItem.findOneAndDelete(filter);
    const deleted = await deleteQuery.exec();
    if (!deleted) {
      sendResponse(res, null, "Not found", 404);
      return;
    }

    const deletedPlain = toPlainObject(deleted);
    await auditAction(req, "delete", "InventoryItem", toEntityId(id) ?? id, deletedPlain, undefined);
    sendResponse(res, { message: "Deleted successfully" });
  } catch (err) {
    next(err);
    return;
  }
}

// —— POST /inventory/:id/use ————————————————————————————————————————————
export async function useInventoryItem(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = req.tenantId;
    if (!tenantId)
      return sendResponse(res, null, 'Tenant ID required', 400);
    const { id } = req.params;
    const { quantity, uom } = req.body as { quantity?: number; uom?: string };

    if (!isValidObjectId(id)) {
      sendResponse(res, null, "Invalid id", 400);
      return;
    }
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      sendResponse(res, null, "Quantity must be a positive number", 400);
      return;
    }
    if (!uom || !isValidObjectId(uom)) {
      sendResponse(res, null, "uom must be a valid ObjectId", 400);
      return;
    }

    const itemQuery = InventoryItem.findOne(scopedQuery(req, { _id: id } as any));
    const item = await itemQuery.exec();
    if (!item) {
      sendResponse(res, null, "Not found", 404);
      return;
    }

    const before = toPlainObject(item);

    // If model types don’t declare .consume, call with a local narrow type
    const doc = item as typeof item & {
      consume?: (q: number, uomId: Types.ObjectId) => Promise<void>;
    };

    if (typeof doc.consume !== "function") {
      sendResponse(res, null, "Consume operation not supported for this item", 400);
      return;
    }

    try {
      await doc.consume(qty, new Types.ObjectId(uom));
    } catch (e: any) {
      sendResponse(res, null, e?.message ?? "Failed to consume item" , 400);
      return;
    }

    await auditAction(req, "use", "InventoryItem", toEntityId(id) ?? id, before, toPlainObject(item));
    sendResponse(res, item);
  } catch (err) {
    next(err);
    return;
  }
}

// —— GET /inventory/search?q= ————————————————————————————————————————————
export async function searchInventoryItems(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const q = String((req.query.q as string) ?? "").trim();
    if (!q) {
      sendResponse(res, []);
      return;
    }

    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const filter = scopedQuery(req, {
      $or: [{ name: regex }, { sku: regex }, { partNumber: regex }],
    } as any);

    const itemsQuery = InventoryItem.find(filter);
    itemsQuery.limit(10);
    itemsQuery.lean<IInventoryItem>();
    const items = await itemsQuery.exec();
    const withQr = items.map((item) => ensureQrCode(item as IInventoryItem, 'part'));
    sendResponse(res, withQr);
  } catch (err) {
    next(err);
    return;
  }
}

