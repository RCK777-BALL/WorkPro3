/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';
import { Types } from 'mongoose';

import { requireAuth } from '../middleware/authMiddleware';
import tenantScope from '../middleware/tenantScope';
import { requireRoles } from '../middleware/requireRoles';
import Location from '../models/Location';
import Part from '../models/Part';
import PurchaseOrder from '../models/PurchaseOrder';
import StockHistory from '../models/StockHistory';
import StockItem from '../models/StockItem';
import Vendor from '../models/Vendor';
import { writeAuditLog } from '../utils/audit';
import sendResponse from '../utils/sendResponse';

const router = Router();
const INVENTORY_ACCESS_ROLES = ['inventory_controller', 'manager', 'admin'] as const;

const toObjectId = (value: unknown): Types.ObjectId | undefined => {
  if (typeof value !== 'string') return undefined;
  if (!Types.ObjectId.isValid(value)) return undefined;
  return new Types.ObjectId(value);
};

const buildScope = (tenantId?: string | null, siteId?: string | null) => {
  if (!tenantId) return null;
  const scope: { tenantId: Types.ObjectId; siteId?: Types.ObjectId } = {
    tenantId: new Types.ObjectId(tenantId),
  };
  if (siteId && Types.ObjectId.isValid(siteId)) {
    scope.siteId = new Types.ObjectId(siteId);
  }
  return scope;
};

const mapPart = (doc: any) => ({
  id: doc._id.toString(),
  tenantId: doc.tenantId?.toString(),
  siteId: doc.siteId?.toString(),
  name: doc.partNo,
  partNumber: doc.partNo,
  partNo: doc.partNo,
  description: doc.description,
  quantity: Number(doc.quantity ?? 0),
  unitCost: Number(doc.cost ?? 0),
  unit: doc.unit,
  minStock: doc.minQty,
  reorderPoint: doc.reorderPoint ?? 0,
  reorderThreshold: doc.minQty,
  leadTime: doc.leadTime,
});

router.use(requireAuth);
router.use(tenantScope);
router.use(requireRoles([...INVENTORY_ACCESS_ROLES]));

router.get('/parts', async (req, res, next) => {
  try {
    const scope = buildScope(req.tenantId, req.siteId);
    if (!scope) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const parts = await Part.find(scope).lean();
    const stock = await StockItem.find(scope).lean();
    const quantityMap = stock.reduce<Record<string, number>>((acc, item) => {
      const key = item.part.toString();
      acc[key] = (acc[key] ?? 0) + Number(item.quantity ?? 0);
      return acc;
    }, {});
    const result = parts.map((p) => mapPart({ ...p, quantity: quantityMap[p._id.toString()] ?? 0 }));
    sendResponse(res, result);
  } catch (err) {
    next(err);
  }
});

router.post('/parts', async (req, res, next) => {
  try {
    const scope = buildScope(req.tenantId, req.siteId);
    if (!scope) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const payload = {
      tenantId: scope.tenantId,
      siteId: scope.siteId,
      partNo: (req.body as any).partNo ?? (req.body as any).name,
      description: (req.body as any).description,
      unit: (req.body as any).unit,
      cost: Number((req.body as any).unitCost ?? 0),
      minQty: Number((req.body as any).minStock ?? (req.body as any).minQty ?? 0),
      maxQty: Number((req.body as any).maxQty ?? 0),
      reorderPoint: Number((req.body as any).reorderPoint ?? 0),
      leadTime: Number((req.body as any).leadTime ?? 0),
      notes: (req.body as any).notes,
    };
    const created = await Part.create(payload);
    sendResponse(res, mapPart(created), null, 201);
  } catch (err) {
    next(err);
  }
});

router.put('/parts/:id', async (req, res, next) => {
  try {
    const scope = buildScope(req.tenantId, req.siteId);
    if (!scope) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      sendResponse(res, null, 'Invalid id', 400);
      return;
    }
    const update = {
      partNo: (req.body as any).partNo ?? (req.body as any).name,
      description: (req.body as any).description,
      unit: (req.body as any).unit,
      cost: Number((req.body as any).unitCost ?? 0),
      minQty: Number((req.body as any).minStock ?? (req.body as any).minQty ?? 0),
      maxQty: Number((req.body as any).maxQty ?? 0),
      reorderPoint: Number((req.body as any).reorderPoint ?? 0),
      leadTime: Number((req.body as any).leadTime ?? 0),
      notes: (req.body as any).notes,
    };
    const updated = await Part.findOneAndUpdate({ ...scope, _id: id }, update, {
      returnDocument: 'after',
      runValidators: true,
    }).lean();
    if (!updated) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    sendResponse(res, mapPart(updated));
  } catch (err) {
    next(err);
  }
});

router.get('/locations', async (req, res, next) => {
  try {
    const scope = buildScope(req.tenantId, req.siteId);
    if (!scope) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const locations = await Location.find(scope).lean();
    sendResponse(res, locations.map((loc) => ({
      id: loc._id.toString(),
      name: loc.name,
      store: loc.store,
      room: loc.room,
      bin: loc.bin,
    })));
  } catch (err) {
    next(err);
  }
});

router.post('/locations', async (req, res, next) => {
  try {
    const scope = buildScope(req.tenantId, req.siteId);
    if (!scope) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const payload = {
      tenantId: scope.tenantId,
      siteId: scope.siteId,
      name: (req.body as any).name,
      store: (req.body as any).store,
      room: (req.body as any).room,
      bin: (req.body as any).bin,
    };
    const created = await Location.create(payload);
    sendResponse(res, {
      id: created._id.toString(),
      name: created.name,
      store: created.store,
      room: created.room,
      bin: created.bin,
    }, null, 201);
  } catch (err) {
    next(err);
  }
});

router.post('/stock', async (req, res, next) => {
  try {
    const scope = buildScope(req.tenantId, req.siteId);
    if (!scope) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const part = toObjectId((req.body as any).partId ?? (req.body as any).part);
    const location = toObjectId((req.body as any).locationId ?? (req.body as any).location);
    if (!part || !location) {
      sendResponse(res, null, 'partId and locationId are required', 400);
      return;
    }
    const payload = {
      tenantId: scope.tenantId,
      siteId: scope.siteId,
      part,
      location,
      quantity: Number((req.body as any).quantity ?? 0),
      unitCost: Number((req.body as any).unitCost ?? 0),
    };
    const created = await StockItem.create(payload);
    sendResponse(res, created, null, 201);
  } catch (err) {
    next(err);
  }
});

router.post('/stock/:id/adjust', async (req, res, next) => {
  try {
    const scope = buildScope(req.tenantId, req.siteId);
    if (!scope) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      sendResponse(res, null, 'Invalid id', 400);
      return;
    }
    const delta = Number((req.body as any).delta);
    const reason = (req.body as any).reason;
    const stock = await StockItem.findOne({ ...scope, _id: id });
    if (!stock) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    stock.quantity = Math.max(0, Number(stock.quantity ?? 0) + delta);
    await stock.save();
    await StockHistory.create({
      tenantId: scope.tenantId,
      siteId: scope.siteId,
      stockItem: stock._id,
      part: stock.part,
      delta,
      reason,
      userId: (req.user as any)?._id,
      balance: stock.quantity,
    });
    sendResponse(res, stock);
  } catch (err) {
    next(err);
  }
});

router.get('/stock/:id/history', async (req, res, next) => {
  try {
    const scope = buildScope(req.tenantId, req.siteId);
    if (!scope) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      sendResponse(res, null, 'Invalid id', 400);
      return;
    }
    const history = await StockHistory.find({ ...scope, stockItem: id })
      .sort({ createdAt: -1 })
      .lean();
    sendResponse(res, history.map((entry) => ({
      id: entry._id.toString(),
      delta: entry.delta,
      reason: entry.reason,
      balance: entry.balance,
      createdAt: entry.createdAt,
    })));
  } catch (err) {
    next(err);
  }
});

router.get('/vendors', async (req, res, next) => {
  try {
    const scope = buildScope(req.tenantId, req.siteId);
    if (!scope) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const vendors = await Vendor.find({ tenantId: scope.tenantId }).lean();
    sendResponse(res, vendors.map((vendor) => ({
      id: vendor._id.toString(),
      name: vendor.name,
      email: vendor.email,
      phone: vendor.phone,
    })));
  } catch (err) {
    next(err);
  }
});

router.get('/alerts', async (req, res, next) => {
  try {
    const scope = buildScope(req.tenantId, req.siteId);
    if (!scope) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const parts = await Part.find(scope).lean();
    const stock = await StockItem.find(scope).lean();
    const quantities = stock.reduce<Record<string, number>>((acc, item) => {
      const key = item.part.toString();
      acc[key] = (acc[key] ?? 0) + Number(item.quantity ?? 0);
      return acc;
    }, {});
    const alerts = parts
      .filter((p) => quantities[p._id.toString()] <= (p.reorderPoint ?? 0))
      .map((p) => ({
        partId: p._id.toString(),
        partName: p.partNo,
        tenantId: scope.tenantId.toString(),
        siteId: scope.siteId?.toString(),
        quantity: quantities[p._id.toString()] ?? 0,
        reorderPoint: p.reorderPoint ?? 0,
        assetNames: [],
        pmTemplateTitles: [],
      }));
    sendResponse(res, alerts);
  } catch (err) {
    next(err);
  }
});

router.get('/purchase-orders', async (req, res, next) => {
  try {
    const scope = buildScope(req.tenantId, req.siteId);
    if (!scope) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const orders = await PurchaseOrder.find(scope).lean();
    sendResponse(res, orders.map((po) => ({
      id: po._id.toString(),
      tenantId: po.tenantId?.toString(),
      vendorId: (po as any).vendorId?.toString() ?? (po as any).vendor?.toString(),
      status: (po as any).status,
      poNumber: (po as any).poNumber,
      autoGenerated: false,
      createdAt: po.createdAt,
      items: (po as any).lines ?? (po as any).items ?? [],
    })));
  } catch (err) {
    next(err);
  }
});

router.post('/purchase-orders', async (req, res, next) => {
  try {
    const scope = buildScope(req.tenantId, req.siteId);
    if (!scope) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const payload = {
      tenantId: scope.tenantId,
      siteId: scope.siteId,
      poNumber: (req.body as any).poNumber,
      status: 'Draft',
      vendorId: toObjectId((req.body as any).vendorId ?? (req.body as any).vendor),
      lines: ((req.body as any).items ?? []).map((item: any) => ({
        part: toObjectId(item.partId ?? item.item ?? item.part),
        qtyOrdered: Number(item.quantity ?? item.qtyOrdered ?? 0),
        qtyReceived: Number(item.qtyReceived ?? 0),
        price: Number(item.unitCost ?? item.price ?? 0),
      })),
    } as any;
    const created = await PurchaseOrder.create(payload);
    await writeAuditLog({
      tenantId: scope.tenantId,
      userId: (req.user as any)?._id,
      action: 'create',
      entityType: 'PurchaseOrder',
      entityId: created._id,
      after: created.toObject(),
    });
    sendResponse(res, created, null, 201);
  } catch (err) {
    next(err);
  }
});

router.get('/purchase-orders/export', async (req, res, next) => {
  try {
    const csv = 'poNumber,status\n';
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="purchase-orders.csv"');
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

router.post('/purchase-orders/:id/status', async (req, res, next) => {
  try {
    const scope = buildScope(req.tenantId, req.siteId);
    if (!scope) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      sendResponse(res, null, 'Invalid id', 400);
      return;
    }
    const nextStatus = (req.body as any).status as string;
    const po = await PurchaseOrder.findOne({ ...scope, _id: id });
    if (!po) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    (po as any).status = nextStatus;
    await po.save();
    await writeAuditLog({
      tenantId: scope.tenantId,
      userId: (req.user as any)?._id,
      action: 'update',
      entityType: 'PurchaseOrder',
      entityId: po._id,
      after: po.toObject(),
    });
    sendResponse(res, po);
  } catch (err) {
    next(err);
  }
});

export default router;
