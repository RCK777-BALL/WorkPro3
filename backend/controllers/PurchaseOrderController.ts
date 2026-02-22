/*
 * SPDX-License-Identifier: MIT
 */

import { Request, Response, NextFunction } from 'express';
import { Types, isValidObjectId } from 'mongoose';

import PurchaseOrder, { type IPurchaseOrder, type IPurchaseOrderLine } from '../models/PurchaseOrder';
import StockHistory from '../models/StockHistory';
import StockItem from '../models/StockItem';
import type { VendorResponse } from '../services/vendorService';
import { getVendor, VendorNotFoundError } from '../services/vendorService';
import type { VendorScopedRequest } from '../types/http';
import { writeAuditLog, sendResponse } from '../utils';

const toPlainObject = (value: unknown): Record<string, unknown> | undefined => {
  if (!value) return undefined;
  if (typeof value === 'object' && typeof (value as any).toObject === 'function') {
    return (value as any).toObject();
  }
  if (typeof value === 'object') {
    return value as Record<string, unknown>;
  }
  return undefined;
};

type PurchaseOrderResponse = {
  id: string;
  tenantId: string;
  siteId?: string;
  poNumber?: string;
  vendorId?: string;
  vendor?: VendorResponse;
  status: IPurchaseOrder['status'];
  lines: Array<IPurchaseOrderLine & { _id?: Types.ObjectId }>;
  createdAt?: string;
  updatedAt?: string;
};

const mapVendor = (value: unknown): VendorResponse | undefined => {
  const vendor = value as
    | {
        _id?: Types.ObjectId;
        id?: string;
        name?: string;
        email?: string;
        phone?: string;
        tags?: string[];
        isActive?: boolean;
      }
    | undefined;
  if (!vendor) return undefined;
  const id = vendor.id ?? vendor._id?.toString();
  if (!id || !vendor.name) return undefined;
  const result: VendorResponse = {
    id,
    tenantId: (vendor as { tenantId?: Types.ObjectId | string }).tenantId
      ? String((vendor as { tenantId?: Types.ObjectId | string }).tenantId)
      : '',
    name: vendor.name,
    tags: Array.isArray(vendor.tags) ? vendor.tags : [],
    isActive: typeof vendor.isActive === 'boolean' ? vendor.isActive : true,
  };
  if (vendor.email) result.email = vendor.email;
  if (vendor.phone) result.phone = vendor.phone;
  return result;
};

const serializePurchaseOrder = (
  po: IPurchaseOrder,
  vendor?: VendorResponse,
): PurchaseOrderResponse => ({
  id: po._id.toString(),
  tenantId: po.tenantId.toString(),
  siteId: po.siteId?.toString(),
  poNumber: po.poNumber,
  vendorId: po.vendorId?.toString(),
  vendor,
  status: po.status,
  lines: (po.lines ?? []).map((line) => ({
    _id: line._id,
    part: line.part,
    qtyOrdered: line.qtyOrdered,
    qtyReceived: line.qtyReceived,
    price: line.price,
  })),
  createdAt: po.createdAt?.toISOString(),
  updatedAt: po.updatedAt?.toISOString(),
});

export const createPurchaseOrder = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<Response | void> => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) return sendResponse(res, null, 'Tenant ID required', 400);

    const vendorId = (req.body as any).vendorId as string | undefined;
    let vendor: VendorResponse | undefined;
    if (vendorId) {
      if (!isValidObjectId(vendorId)) {
        return sendResponse(res, null, 'Invalid vendor id', 400);
      }
      try {
        vendor = await getVendor(tenantId, vendorId);
      } catch (err) {
        if (err instanceof VendorNotFoundError) {
          return sendResponse(res, null, err.message, 404);
        }
        throw err;
      }
    }

    const rawLines: Array<Partial<IPurchaseOrderLine>> = Array.isArray((req.body as any).lines)
      ? (req.body as IPurchaseOrder).lines ?? []
      : [];
    const lines: IPurchaseOrderLine[] = rawLines
      .map((line: Partial<IPurchaseOrderLine>) => ({
        part: line.part as Types.ObjectId,
        qtyOrdered: Number(line.qtyOrdered ?? (line as any).quantity ?? 0),
        qtyReceived: Number(line.qtyReceived ?? 0),
        price: Number(line.price ?? (line as any).unitCost ?? 0),
      }))
      .filter((line: IPurchaseOrderLine) => isValidObjectId(line.part) && line.qtyOrdered > 0);

    if (lines.length === 0) {
      return sendResponse(res, null, 'At least one line item is required', 400);
    }

    const po = await PurchaseOrder.create({
      status: 'Draft',
      tenantId,
      vendorId: vendorId ? new Types.ObjectId(vendorId) : undefined,
      lines,
      poNumber: (req.body as any).poNumber,
      siteId: req.siteId ? new Types.ObjectId(req.siteId) : undefined,
    });
    const userId = (req.user as any)?._id || (req.user as any)?.id;
    const entityId = po._id as Types.ObjectId;
    await writeAuditLog({
      tenantId,
      userId,
      action: 'create',
      entityType: 'PurchaseOrder',
      entityId,
      after: toPlainObject(po),
    });
    sendResponse(res, serializePurchaseOrder(po, vendor), null, 201);
    return;
  } catch (err) {
    next(err);
    return;
  }
};

export const getPurchaseOrder = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<Response | void> => {
  try {
    const raw = req.params.id;
    const id = Array.isArray(raw) ? raw[0] : raw;

    if (!isValidObjectId(id)) {
      sendResponse(res, null, 'Invalid id', 400);
      return;
    }
    const objectId = new Types.ObjectId(id);
    const po = await PurchaseOrder.findOne({ _id: objectId, tenantId: req.tenantId })
      .populate('vendorId')
      .lean();
    if (!po) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    sendResponse(res, serializePurchaseOrder(po as any, mapVendor((po as any).vendorId)));
    return;
  } catch (err) {
    next(err);
    return;
  }
};

export const listVendorPurchaseOrders = async (
  req: VendorScopedRequest,
  res: Response,
  next: NextFunction,
): Promise<Response | void> => {
  try {
    const vendorId = req.vendorId;
    const pos = await PurchaseOrder.find({ vendor: vendorId }).populate('vendorId').lean();
    const payload = pos.map((po) => serializePurchaseOrder(po as any, mapVendor((po as any).vendorId)));
    sendResponse(res, payload);
    return;
  } catch (err) {
    next(err);
    return;
  }
};

export const listPurchaseOrders = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<Response | void> => {
  try {
    if (!req.tenantId) {
      return sendResponse(res, null, 'Tenant ID required', 400);
    }
    const orders = await PurchaseOrder.find({ tenantId: req.tenantId }).populate('vendorId').lean();
    const payload = orders.map((order) => serializePurchaseOrder(order as any, mapVendor((order as any).vendorId)));
    sendResponse(res, payload);
    return;
  } catch (err) {
    next(err);
    return;
  }
};

export const updatePurchaseOrderStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<Response | void> => {
  try {
    const raw = req.params.id;
    const id = Array.isArray(raw) ? raw[0] : raw;

    const { status } = req.body as { status: string };
    if (!isValidObjectId(id)) {
      sendResponse(res, null, 'Invalid id', 400);
      return;
    }
    const allowed = ['Draft', 'Pending', 'Approved', 'Ordered', 'Received', 'Closed'];
    if (!allowed.includes(status)) {
      sendResponse(res, null, 'Invalid status', 400);
      return;
    }
    const po = await PurchaseOrder.findOne({ _id: new Types.ObjectId(id), tenantId: req.tenantId }).populate('vendorId');
    if (!po) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    const before = toPlainObject(po);
    (po as any).status = status as any;
    await po.save();
    await writeAuditLog({
      tenantId: req.tenantId!,
      userId: (req.user as any)?._id,
      action: 'update',
      entityType: 'PurchaseOrder',
      entityId: po._id,
      before,
      after: toPlainObject(po),
    });
    sendResponse(res, serializePurchaseOrder(po as any, mapVendor((po as any).vendorId)));
    return;
  } catch (err) {
    next(err);
    return;
  }
};

export const receivePurchaseOrder = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<Response | void> => {
  try {
    const raw = req.params.id;
    const id = Array.isArray(raw) ? raw[0] : raw;

    if (!isValidObjectId(id)) {
      sendResponse(res, null, 'Invalid id', 400);
      return;
    }
    const po = await PurchaseOrder.findOne({ _id: new Types.ObjectId(id), tenantId: req.tenantId }).populate('vendorId');
    if (!po) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    const receipts = (req.body as any).receipts ?? [];
    receipts.forEach((line: any) => {
      const target = (po as any).lines.find((l: any) => l._id?.toString() === line.lineId || l.part?.toString() === line.partId);
      if (!target) return;
      target.qtyReceived = Math.min((target.qtyReceived ?? 0) + Number(line.qty ?? 0), target.qtyOrdered ?? 0);
    });
    (po as any).status = (po as any).lines.every((l: any) => (l.qtyReceived ?? 0) >= (l.qtyOrdered ?? 0))
      ? 'Received'
      : 'Ordered';
    await po.save();

    await Promise.all(
      ((po as any).lines ?? []).map(async (line: any) => {
        if (!line.part) return;
        const stock = await StockItem.findOne({ tenantId: po.tenantId, part: line.part });
        if (!stock) return;
        stock.quantity = Number(stock.quantity ?? 0) + Number(line.qtyReceived ?? 0);
        await stock.save();
        await StockHistory.create({
          tenantId: po.tenantId,
          siteId: po.siteId,
          stockItem: stock._id,
          part: stock.part,
          delta: Number(line.qtyReceived ?? 0),
          reason: `PO ${po.poNumber ?? po._id} receipt`,
          userId: (req.user as any)?._id,
          balance: stock.quantity,
        });
      }),
    );
    sendResponse(res, serializePurchaseOrder(po as any, mapVendor((po as any).vendorId)));
    return;
  } catch (err) {
    next(err);
    return;
  }
};

export const updateVendorPurchaseOrder = async (
  req: VendorScopedRequest,
  res: Response,
  next: NextFunction,
): Promise<Response | void> => {
  try {
    const vendorId = req.vendorId as string;
    const raw = req.params.id;
    const id = Array.isArray(raw) ? raw[0] : raw;
    
    const { status } = req.body as { status: string };
    const allowed = ['acknowledged', 'shipped'];
    if (!allowed.includes(status)) {
      sendResponse(res, null, 'Invalid status', 400);
      return;
    }
    if (!isValidObjectId(id)) {
      sendResponse(res, null, 'Invalid id', 400);
      return;
    }
    const objectId = new Types.ObjectId(id);
    const po = await PurchaseOrder.findById(objectId).populate('vendorId');
    if (!po) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    if (!po.vendorId || po.vendorId.toString() !== vendorId) {
      sendResponse(res, null, 'Forbidden', 403);
      return;
    }
    const before = toPlainObject(po);
    po.status = status as any;
    await po.save();
    const userId = (req.user as any)?._id || (req.user as any)?.id;
    const entityId = objectId;
    await writeAuditLog({
      tenantId: po.tenantId,
      userId,
      action: 'update',
      entityType: 'PurchaseOrder',
      entityId,
      before,
      after: toPlainObject(po),
    });
    sendResponse(res, serializePurchaseOrder(po as any, mapVendor((po as any).vendorId)));
    return;
  } catch (err) {
    next(err);
    return;
  }
};
