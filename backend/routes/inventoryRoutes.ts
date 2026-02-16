/*
 * SPDX-License-Identifier: MIT
 */

import { Router, type Request } from "express";
import { Types, isValidObjectId } from "mongoose";

import { requireAuth } from "../middleware/authMiddleware";
import tenantScope from "../middleware/tenantScope";
import InventoryItem from "../models/InventoryItem";
import type { AuthedRequest } from "../types/http";
import { ensureQrCode, generateQrCodeValue } from "../services/qrCode";

const router = Router();

const resolveTenantId = (raw?: string | null) => {
  if (!raw) return null;
  const value = raw.toString().trim();
  if (!value) return null;
  if (!Types.ObjectId.isValid(value)) return null;
  return new Types.ObjectId(value);
};

const buildScope = (req: AuthedRequest | Request) => {
  const authedReq = req as AuthedRequest;
  const tenant = resolveTenantId(authedReq.tenantId as string | undefined);
  if (!tenant) {
    return null;
  }

  const scope: { tenantId: Types.ObjectId; siteId?: Types.ObjectId } = { tenantId: tenant };
  if (authedReq.siteId && Types.ObjectId.isValid(authedReq.siteId)) {
    scope.siteId = new Types.ObjectId(authedReq.siteId);
  }
  return scope;
};

const parseBody = (body: Record<string, unknown> | undefined) => {
  if (!body) return {} as Record<string, unknown>;

  const numericFields = new Set([
    "quantity",
    "unitCost",
    "minThreshold",
    "reorderThreshold",
    "reorderPoint",
  ]);
  const dateFields = new Set(["lastRestockDate", "lastOrderDate"]);

  const payload: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(body)) {
    if (key === "tenantId" || key === "siteId" || key === "_id") continue;
    if (value === undefined || value === null) continue;

    if (numericFields.has(key)) {
      const num = typeof value === "number" ? value : Number(value);
      if (!Number.isFinite(num)) continue;
      payload[key] = num;
      continue;
    }

    if (dateFields.has(key) && typeof value === "string") {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.valueOf())) {
        payload[key] = parsed;
        continue;
      }
    }

    payload[key] = value;
  }

  return payload;
};

router.use(requireAuth);
router.use(tenantScope);

router.get("/summary", async (req, res, next) => {
  try {
    const scope = buildScope(req);
    if (!scope) {
      res.status(400).json({ message: "Tenant ID required" });
      return;
    }

    const items = await InventoryItem.find(scope)
      .select({ name: 1, quantity: 1, reorderThreshold: 1 })
      .lean();

    const summary = items.map((item) => {
      const quantity = Number(item.quantity ?? 0);
      const threshold = Number(item.reorderThreshold ?? 0);
      return {
        name: item.name,
        stock: quantity,
        status: quantity <= threshold ? "low" : "ok",
      };
    });

    res.json(summary);
  } catch (err) {
    next(err);
  }
});

router.get("/low-stock", async (req, res, next) => {
  try {
    const scope = buildScope(req);
    if (!scope) {
      res.status(400).json({ message: "Tenant ID required" });
      return;
    }

    const items = await InventoryItem.find({
      ...scope,
      $expr: { $lte: ["$quantity", { $ifNull: ["$reorderThreshold", 0] }] },
    });

    const withQr = items.map((item) => ensureQrCode(item, 'part'));

    res.json(withQr);
  } catch (err) {
    next(err);
  }
});

router.get("/search", async (req, res, next) => {
  try {
    const scope = buildScope(req);
    if (!scope) {
      res.status(400).json({ message: "Tenant ID required" });
      return;
    }

    const term = String(req.query.q ?? "").trim();
    if (!term) {
      res.json([]);
      return;
    }

    const pattern = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

    const results = await InventoryItem.find({
      ...scope,
      $or: [{ name: pattern }, { sku: pattern }, { partNumber: pattern }],
    })
      .limit(10)
      .lean();

    const withQr = results.map((item) => ensureQrCode(item, 'part'));

    res.json(withQr);
  } catch (err) {
    next(err);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const scope = buildScope(req);
    if (!scope) {
      res.status(400).json({ message: "Tenant ID required" });
      return;
    }

    const items = await InventoryItem.find(scope).lean();
    const withQr = items.map((item) => ensureQrCode(item, 'part'));
    res.json(withQr);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const scope = buildScope(req);
    if (!scope) {
      res.status(400).json({ message: "Tenant ID required" });
      return;
    }

    const { id } = req.params;
    if (!isValidObjectId(id)) {
      res.status(400).json({ message: "Invalid id" });
      return;
    }

    const item = await InventoryItem.findOne({ ...scope, _id: id });
    if (!item) {
      res.status(404).json({ message: "Not found" });
      return;
    }

    const quantity = Number(item.quantity ?? 0);
    const threshold = Number(item.reorderThreshold ?? 0);
    const payload = item.toObject();
    const withQr = ensureQrCode(payload, 'part');

    res.json({ ...withQr, status: quantity <= threshold ? "low" : "ok" });
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const scope = buildScope(req);
    if (!scope) {
      res.status(400).json({ message: "Tenant ID required" });
      return;
    }

    const payload = parseBody(req.body as Record<string, unknown> | undefined);
    const created = await InventoryItem.create({
      ...payload,
      tenantId: scope.tenantId,
      siteId: scope.siteId,
    });

    if (!created.qrCode) {
      created.qrCode = generateQrCodeValue({
        type: 'part',
        id: created._id.toString(),
        tenantId: scope.tenantId.toString(),
      });
      await created.save();
    }

    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const scope = buildScope(req);
    if (!scope) {
      res.status(400).json({ message: "Tenant ID required" });
      return;
    }

    const { id } = req.params;
    if (!isValidObjectId(id)) {
      res.status(400).json({ message: "Invalid id" });
      return;
    }

    const payload = parseBody(req.body as Record<string, unknown> | undefined);
    payload.qrCode = generateQrCodeValue({ type: 'part', id, tenantId: scope.tenantId.toString() });
    const updated = await InventoryItem.findOneAndUpdate(
      { ...scope, _id: id },
      payload,
      { returnDocument: 'after', runValidators: true },
    );

    if (!updated) {
      res.status(404).json({ message: "Not found" });
      return;
    }

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const scope = buildScope(req);
    if (!scope) {
      res.status(400).json({ message: "Tenant ID required" });
      return;
    }

    const { id } = req.params;
    if (!isValidObjectId(id)) {
      res.status(400).json({ message: "Invalid id" });
      return;
    }

    const deleted = await InventoryItem.findOneAndDelete({ ...scope, _id: id });
    if (!deleted) {
      res.status(404).json({ message: "Not found" });
      return;
    }

    res.json({ message: "Deleted successfully" });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/use", async (req, res, next) => {
  try {
    const scope = buildScope(req);
    if (!scope) {
      res.status(400).json({ message: "Tenant ID required" });
      return;
    }

    const { id } = req.params;
    if (!isValidObjectId(id)) {
      res.status(400).json({ message: "Invalid id" });
      return;
    }

    const quantity = Number((req.body as Record<string, unknown> | undefined)?.quantity);
    const uom = (req.body as Record<string, unknown> | undefined)?.uom;

    if (!Number.isFinite(quantity) || quantity <= 0) {
      res.status(400).json({ message: "Quantity must be a positive number" });
      return;
    }

    if (typeof uom !== "string" || !isValidObjectId(uom)) {
      res.status(400).json({ message: "uom must be a valid ObjectId" });
      return;
    }

    const item = await InventoryItem.findOne({ ...scope, _id: id });
    if (!item) {
      res.status(404).json({ message: "Not found" });
      return;
    }

    if (typeof item.consume !== "function") {
      res.status(400).json({ message: "Consume operation not supported for this item" });
      return;
    }

    await item.consume(quantity, new Types.ObjectId(uom));

    res.json(item);
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ message: err.message });
      return;
    }
    next(err);
  }
});

export default router;
