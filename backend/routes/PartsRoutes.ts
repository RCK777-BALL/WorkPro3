/*
 * SPDX-License-Identifier: MIT
 */

import { randomUUID } from "crypto";
import { Router } from "express";
import type { Request } from "express";
import multer from "multer";

import { requireAuth } from "../middleware/authMiddleware";
import tenantScope from "../middleware/tenantScope";

interface StoredPart {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  category?: string;
  sku: string;
  location?: string;
  quantity: number;
  unitCost: number;
  reorderPoint: number;
  reorderThreshold?: number;
  lastRestockDate?: string;
  vendor?: string;
  lastOrderDate: string;
  image?: string;
  createdAt: string;
  updatedAt: string;
}

const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_SIZE_BYTES },
});

const partsStore = new Map<string, StoredPart[]>();

const sampleParts: Omit<StoredPart, "tenantId" | "createdAt" | "updatedAt">[] = [
  {
    id: "PART-001",
    name: "Universal Bearing",
    description: "High durability bearing for general purpose machinery",
    category: "Mechanical",
    sku: "BRG-UNIV-001",
    location: "Aisle 3, Bin 4",
    quantity: 42,
    unitCost: 18.5,
    reorderPoint: 15,
    reorderThreshold: 10,
    lastRestockDate: new Date().toISOString().split("T")[0],
    vendor: "VEN-001",
    lastOrderDate: new Date().toISOString().split("T")[0],
    image: undefined,
  },
];

const router = Router();

router.use(requireAuth);
router.use(tenantScope);

const todayString = () => new Date().toISOString().split("T")[0];

const ensureTenant = (req: Request) =>
  req.tenantId ? { tenantId: req.tenantId } : { error: true as const };

const getTenantParts = (tenantId: string) => {
  const existing = partsStore.get(tenantId);
  if (existing) return existing;
  const seeded = sampleParts.map((part) => ({
    ...part,
    tenantId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
  partsStore.set(tenantId, seeded);
  return seeded;
};

const toOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const toNumber = (value: unknown, fallback = 0): number => {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const toDateString = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.valueOf())) return undefined;
  return parsed.toISOString().split("T")[0];
};

const fileToDataUrl = (file?: Express.Multer.File | null) => {
  if (!file || !file.buffer?.length) return undefined;
  const base64 = file.buffer.toString("base64");
  return `data:${file.mimetype};base64,${base64}`;
};

const hasBodyField = (body: Record<string, unknown> | undefined, key: string) =>
  Boolean(body && Object.prototype.hasOwnProperty.call(body, key));

const getBodyValue = <T = unknown>(
  body: Record<string, unknown> | undefined,
  key: string,
): T | undefined => (body && key in body ? (body[key] as T) : undefined);

router.get("/", (req, res) => {
  const result = ensureTenant(req);
  if (result.error) {
    res.status(400).json({ message: "Tenant ID required" });
    return;
  }

  const parts = getTenantParts(result.tenantId);
  res.json({ success: true, data: parts });
});

router.post("/", upload.single("partImage"), (req, res) => {
  const result = ensureTenant(req);
  if (result.error) {
    res.status(400).json({ message: "Tenant ID required" });
    return;
  }

  const name = toOptionalString(req.body?.name);
  const sku = toOptionalString(req.body?.sku);

  if (!name || !sku) {
    res.status(400).json({ message: "Name and SKU are required" });
    return;
  }

  const now = new Date().toISOString();
  const newPart: StoredPart = {
    id: randomUUID(),
    tenantId: result.tenantId,
    name,
    description: toOptionalString(req.body?.description),
    category: toOptionalString(req.body?.category),
    sku,
    location: toOptionalString(req.body?.location),
    quantity: toNumber(req.body?.quantity),
    unitCost: toNumber(req.body?.unitCost),
    reorderPoint: toNumber(req.body?.reorderPoint),
    reorderThreshold: req.body?.reorderThreshold !== undefined
      ? toNumber(req.body?.reorderThreshold)
      : undefined,
    lastRestockDate: toDateString(req.body?.lastRestockDate) ?? todayString(),
    vendor: toOptionalString(req.body?.vendor),
    lastOrderDate: toDateString(req.body?.lastOrderDate) ?? todayString(),
    image: fileToDataUrl(req.file),
    createdAt: now,
    updatedAt: now,
  };

  const parts = getTenantParts(result.tenantId);
  parts.push(newPart);

  res.status(201).json({ success: true, data: newPart });
});

router.put("/:id", upload.single("partImage"), (req, res) => {
  const result = ensureTenant(req);
  if (result.error) {
    res.status(400).json({ message: "Tenant ID required" });
    return;
  }

  const parts = getTenantParts(result.tenantId);
  const partIndex = parts.findIndex((p) => p.id === req.params.id);

  if (partIndex === -1) {
    res.status(404).json({ message: "Part not found" });
    return;
  }

  const existing = parts[partIndex];
  const updatedAt = new Date().toISOString();

  const body = req.body as Record<string, unknown> | undefined;

  const updated: StoredPart = {
    ...existing,
    name: hasBodyField(body, "name")
      ? toOptionalString(getBodyValue(body, "name")) ?? existing.name
      : existing.name,
    description: hasBodyField(body, "description")
      ? toOptionalString(getBodyValue(body, "description"))
      : existing.description,
    category: hasBodyField(body, "category")
      ? toOptionalString(getBodyValue(body, "category"))
      : existing.category,
    sku: hasBodyField(body, "sku")
      ? toOptionalString(getBodyValue(body, "sku")) ?? existing.sku
      : existing.sku,
    location: hasBodyField(body, "location")
      ? toOptionalString(getBodyValue(body, "location"))
      : existing.location,
    quantity: hasBodyField(body, "quantity")
      ? toNumber(getBodyValue(body, "quantity"), existing.quantity)
      : existing.quantity,
    unitCost: hasBodyField(body, "unitCost")
      ? toNumber(getBodyValue(body, "unitCost"), existing.unitCost)
      : existing.unitCost,
    reorderPoint: hasBodyField(body, "reorderPoint")
      ? toNumber(getBodyValue(body, "reorderPoint"), existing.reorderPoint)
      : existing.reorderPoint,
    reorderThreshold: hasBodyField(body, "reorderThreshold")
      ? toNumber(getBodyValue(body, "reorderThreshold"), existing.reorderThreshold ?? 0)
      : existing.reorderThreshold,
    lastRestockDate: hasBodyField(body, "lastRestockDate")
      ? toDateString(getBodyValue(body, "lastRestockDate")) ?? existing.lastRestockDate
      : existing.lastRestockDate,
    vendor: hasBodyField(body, "vendor")
      ? toOptionalString(getBodyValue(body, "vendor"))
      : existing.vendor,
    lastOrderDate: hasBodyField(body, "lastOrderDate")
      ? toDateString(getBodyValue(body, "lastOrderDate")) ?? existing.lastOrderDate
      : existing.lastOrderDate,
    image: req.file ? fileToDataUrl(req.file) : existing.image,
    updatedAt,
  };

  parts[partIndex] = updated;

  res.json({ success: true, data: updated });
});

router.post("/:id/adjust", (req, res) => {
  const result = ensureTenant(req);
  if (result.error) {
    res.status(400).json({ message: "Tenant ID required" });
    return;
  }

  const parts = getTenantParts(result.tenantId);
  const part = parts.find((p) => p.id === req.params.id);

  if (!part) {
    res.status(404).json({ message: "Part not found" });
    return;
  }

  const delta = toNumber(req.body?.delta);
  if (!Number.isFinite(delta) || delta === 0) {
    res.status(400).json({ message: "delta must be a non-zero number" });
    return;
  }

  part.quantity += delta;
  part.updatedAt = new Date().toISOString();

  res.json({ success: true, data: part });
});

export default router;
