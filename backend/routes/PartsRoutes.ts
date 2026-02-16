/*
 * SPDX-License-Identifier: MIT
 */

import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { Router } from 'express';
import multer, { MulterError } from 'multer';
import { Types, isValidObjectId, type FlattenMaps } from 'mongoose';

import { requireAuth } from '../middleware/authMiddleware';
import tenantScope from '../middleware/tenantScope';
import InventoryItem, { type IInventoryItem } from '../models/InventoryItem';
import logger from '../utils/logger';
import { writeAuditLog } from '../utils/audit';
import { toEntityId, toObjectId } from '../utils/ids';
import sendResponse from '../utils/sendResponse';

const router = Router();

const ALLOWED_FIELD_LIST = [
  'name',
  'description',
  'partNumber',
  'sku',
  'category',
  'quantity',
  'unitCost',
  'unit',
  'uom',
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

type AllowedField = (typeof ALLOWED_FIELD_LIST)[number];

const ALLOWED_FIELDS = new Set<AllowedField>(ALLOWED_FIELD_LIST);

const NUMERIC_FIELDS = new Set<AllowedField>([
  'quantity',
  'unitCost',
  'minThreshold',
  'reorderThreshold',
  'reorderPoint',
]);

const DATE_FIELDS = new Set<AllowedField>(['lastRestockDate', 'lastOrderDate']);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error('Unsupported file type'));
  },
});

const handleFormData: RequestHandler = (req, res, next) => {
  if (!req.is('multipart/form-data')) {
    next();
    return;
  }

  upload.single('partImage')(req, res, (err) => {
    if (!err) {
      next();
      return;
    }

    if (err instanceof MulterError && err.code === 'LIMIT_FILE_SIZE') {
      sendResponse(res, null, 'File too large', 400);
      return;
    }

    const message = err instanceof Error ? err.message : 'Invalid file upload';
    sendResponse(res, null, message, 400);
  });
};

type LeanInventoryItem = FlattenMaps<IInventoryItem> & {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  vendor?: Types.ObjectId | string;
  siteId?: Types.ObjectId | string;
};

type PartPayloadResult = {
  data: Partial<IInventoryItem>;
  invalid?: string[];
};

function normalizeValue(key: string, value: unknown): unknown {
  if (key === 'tenantId') {
    return undefined;
  }
  if (value == null || (typeof value === 'string' && value.trim() === '')) {
    return undefined;
  }

  if (NUMERIC_FIELDS.has(key as AllowedField)) {
    const numeric = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(numeric) ? numeric : undefined;
  }

  if (DATE_FIELDS.has(key as AllowedField)) {
    const date = value instanceof Date ? value : new Date(String(value));
    return Number.isNaN(date.valueOf()) ? undefined : date;
  }

  if (key === 'vendor' || key === 'asset' || key === 'siteId' || key === 'sharedPartId' || key === 'uom') {
    return toObjectId(value as any);
  }

  return value;
}

function buildPartPayload(body: Record<string, unknown>): PartPayloadResult {
  const invalid = Object.keys(body).filter((key) => !ALLOWED_FIELDS.has(key as AllowedField));
  if (invalid.length) {
    return { data: {}, invalid };
  }

  const data: Partial<IInventoryItem> = {};
  for (const [key, raw] of Object.entries(body)) {
    const normalized = normalizeValue(key, raw);
    if (normalized === undefined) continue;
    (data as Record<string, unknown>)[key] = normalized;
  }
  return { data };
}

const formatDate = (value?: unknown): string | undefined => {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.valueOf())) return undefined;
  return date.toISOString().split('T')[0];
};

function mapToPart(item: LeanInventoryItem) {
  const id = toEntityId(item._id) ?? item._id.toString();
  return {
    id,
    name: item.name,
    description: item.description ?? undefined,
    category: item.category ?? undefined,
    sku: item.sku ?? '',
    location: item.location ?? undefined,
    quantity: Number(item.quantity ?? 0),
    unitCost: Number(item.unitCost ?? 0),
    reorderPoint: Number(item.reorderPoint ?? 0),
    reorderThreshold:
      item.reorderThreshold === undefined ? undefined : Number(item.reorderThreshold ?? 0),
    lastRestockDate: formatDate(item.lastRestockDate),
    vendor: toEntityId(item.vendor),
    lastOrderDate: formatDate(item.lastOrderDate),
    image: item.image ?? undefined,
  };
}

function applyTenantScope<T extends Record<string, unknown>>(req: Request, base: T = {} as T): T {
  const scoped = { ...base } as Record<string, unknown>;
  if (req.tenantId) scoped.tenantId = req.tenantId;
  if (req.siteId) scoped.siteId = req.siteId;
  return scoped as T;
}

async function ensureTenant(req: Request, res: Response): Promise<boolean> {
  if (!req.tenantId) {
    sendResponse(res, null, 'Tenant ID required', 400);
    return false;
  }
  return true;
}

router.use(requireAuth);
router.use(tenantScope);

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = applyTenantScope(req, {} as Record<string, unknown>);
    const items = (await InventoryItem.find(query).lean().exec()) as LeanInventoryItem[];
    const parts = items.map(mapToPart);
    sendResponse(res, parts);
  } catch (err) {
    next(err);
  }
});

router.post('/', handleFormData, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!(await ensureTenant(req, res))) return;

    const { data, invalid } = buildPartPayload(req.body as Record<string, unknown>);
    if (invalid && invalid.length) {
      sendResponse(res, null, `Invalid fields: ${invalid.join(', ')}`, 400);
      return;
    }

    const payload = applyTenantScope(req, data);
    const saved = await new InventoryItem(payload).save();
    const plain = saved.toObject() as LeanInventoryItem;

    try {
      const userId = (req.user as any)?._id || (req.user as any)?.id;
      await writeAuditLog({
        tenantId: req.tenantId,
        userId,
        action: 'create',
        entityType: 'InventoryItem',
        entityId: toEntityId(saved._id),
        after: plain,
      });
    } catch (logErr) {
      logger.warn('Failed to write audit log for part creation', logErr);
    }

    sendResponse(res, mapToPart(plain), null, 201);
  } catch (err) {
    logger.error('Error creating part', err);
    next(err);
  }
});

router.put('/:id', handleFormData, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!(await ensureTenant(req, res))) return;

    const { id } = req.params;
    if (!isValidObjectId(id)) {
      sendResponse(res, null, 'Invalid id', 400);
      return;
    }

    const { data, invalid } = buildPartPayload(req.body as Record<string, unknown>);
    if (invalid && invalid.length) {
      sendResponse(res, null, `Invalid fields: ${invalid.join(', ')}`, 400);
      return;
    }

    const filter = applyTenantScope(req, { _id: id });
    const existing = (await InventoryItem.findOne(filter).lean().exec()) as LeanInventoryItem | null;
    if (!existing) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }

    const updated = (await InventoryItem.findOneAndUpdate(filter, data, {
      returnDocument: 'after',
      runValidators: true,
      lean: true,
    }).exec()) as LeanInventoryItem | null;
    if (!updated) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }

    try {
      const userId = (req.user as any)?._id || (req.user as any)?.id;
      await writeAuditLog({
        tenantId: req.tenantId,
        userId,
        action: 'update',
        entityType: 'InventoryItem',
        entityId: toEntityId(id),
        before: existing,
        after: updated,
      });
    } catch (logErr) {
      logger.warn('Failed to write audit log for part update', logErr);
    }

    sendResponse(res, mapToPart(updated));
  } catch (err) {
    logger.error('Error updating part', err);
    next(err);
  }
});

router.post('/:id/adjust', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!(await ensureTenant(req, res))) return;

    const { id } = req.params;
    if (!isValidObjectId(id)) {
      sendResponse(res, null, 'Invalid id', 400);
      return;
    }

    const delta = Number((req.body as Record<string, unknown>).delta);
    if (!Number.isFinite(delta) || delta === 0) {
      sendResponse(res, null, 'delta must be a non-zero number', 400);
      return;
    }

    const reasonRaw = (req.body as Record<string, unknown>).reason;
    const reason = typeof reasonRaw === 'string' ? reasonRaw.trim() : undefined;

    const filter = applyTenantScope(req, { _id: id });
    const existingDoc = await InventoryItem.findOne(filter);
    if (!existingDoc) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }

    const before = existingDoc.toObject() as LeanInventoryItem;
    const nextQuantity = Math.max(0, Number(existingDoc.quantity ?? 0) + delta);
    existingDoc.quantity = nextQuantity;
    await existingDoc.save();

    try {
      const StockHistory = (await import('../models/StockHistory')).default;
      await StockHistory.create({
        tenantId: req.tenantId,
        siteId: req.siteId ? new Types.ObjectId(req.siteId) : undefined,
        stockItem: existingDoc._id,
        part: existingDoc.sharedPartId ?? existingDoc._id,
        delta,
        reason,
        userId: (req.user as any)?._id,
        balance: nextQuantity,
      });
    } catch (historyErr) {
      logger.warn('Failed to write stock history', historyErr);
    }

    const afterObject = existingDoc.toObject() as LeanInventoryItem & {
      _adjustment?: { delta: number; reason?: string };
    };
    if (reason) {
      afterObject._adjustment = { delta, reason };
    } else {
      afterObject._adjustment = { delta };
    }

    try {
      const userId = (req.user as any)?._id || (req.user as any)?.id;
      await writeAuditLog({
        tenantId: req.tenantId,
        userId,
        action: 'adjust',
        entityType: 'InventoryItem',
        entityId: toEntityId(id),
        before,
        after: afterObject,
      });
    } catch (logErr) {
      logger.warn('Failed to write audit log for part adjustment', logErr);
    }

    sendResponse(res, mapToPart(afterObject));
  } catch (err) {
    logger.error('Error adjusting part', err);
    next(err);
  }
});

export default router;
