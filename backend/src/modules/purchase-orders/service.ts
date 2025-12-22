/*
 * SPDX-License-Identifier: MIT
 */

import { Types } from 'mongoose';
import InventoryMovementModel from '../../../models/InventoryMovement';
import PartStockModel from '../../../models/PartStock';
import PartModel from '../inventory/models/Part';
import type { PurchaseOrder, PurchaseOrderInput, ReceiptInput } from './types';
import PurchaseOrderModel, {
  type PurchaseOrderAuditEntry,
  type PurchaseOrderDocument,
  type PurchaseOrderItem,
  type PurchaseOrderStatus,
} from './model';

export class PurchaseOrderError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'PurchaseOrderError';
    this.status = status;
  }
}

export interface PurchaseOrderContext {
  tenantId: string;
  userId?: string;
  siteId?: string;
}

const ALLOWED_TRANSITIONS: Record<PurchaseOrderStatus, PurchaseOrderStatus[]> = {
  draft: ['sent', 'canceled'],
  sent: ['partially_received', 'received', 'canceled'],
  partially_received: ['received', 'closed'],
  received: ['closed'],
  closed: [],
  canceled: [],
};

const toObjectId = (value: string | undefined, label: string): Types.ObjectId => {
  if (!value || !Types.ObjectId.isValid(value)) {
    throw new PurchaseOrderError(`Invalid ${label}`, 400);
  }
  return new Types.ObjectId(value);
};

const ensurePurchaseOrder = async (
  context: PurchaseOrderContext,
  id: string,
): Promise<PurchaseOrderDocument> => {
  const po = await PurchaseOrderModel.findOne({ _id: id, tenantId: context.tenantId });
  if (!po) {
    throw new PurchaseOrderError('Purchase order not found', 404);
  }
  return po;
};

const addAudit = (
  po: PurchaseOrderDocument,
  action: PurchaseOrderAuditEntry['action'],
  userId?: string,
  note?: string,
): void => {
  po.auditTrail = po.auditTrail ?? [];
  po.auditTrail.push({
    action,
    at: new Date(),
    userId: userId ? toObjectId(userId, 'user id') : undefined,
    note,
  });
};

const recalcTotals = (po: PurchaseOrderDocument): void => {
  po.subtotal = (po.items ?? []).reduce((sum, item) => sum + item.quantity * (item.unitCost ?? 0), 0);
  po.receivedTotal = (po.items ?? []).reduce((sum, item) => sum + item.received * (item.unitCost ?? 0), 0);
};

const serializePurchaseOrder = (po: PurchaseOrderDocument): PurchaseOrder => ({
  id: (po._id as Types.ObjectId).toString(),
  vendorId: po.vendorId.toString(),
  notes: po.notes,
  status: po.status,
  items: po.items.map((item) => ({
    partId: item.partId.toString(),
    quantity: item.quantity,
    unitCost: item.unitCost,
    received: item.received,
    status: item.status,
  })),
  totalCost: po.totalCost,
  subtotal: po.subtotal,
  receivedTotal: po.receivedTotal,
  auditTrail: po.auditTrail ?? [],
  createdAt: po.createdAt?.toISOString() ?? new Date().toISOString(),
  updatedAt: po.updatedAt?.toISOString(),
});

export const listPurchaseOrders = async (
  context: PurchaseOrderContext,
): Promise<PurchaseOrder[]> => {
  const pos = await PurchaseOrderModel.find({ tenantId: context.tenantId }).sort({ createdAt: -1 }).limit(100);
  return pos.map((po) => serializePurchaseOrder(po));
};

const normalizeItems = (items: PurchaseOrderInput['items']): PurchaseOrderItem[] =>
  items.map((item) => ({
    partId: toObjectId(item.partId, 'part id'),
    quantity: item.quantity,
    unitCost: item.unitCost,
    received: 0,
    receipts: [],
    backordered: item.quantity,
    status: 'open',
  }));

const assertEditable = (po: PurchaseOrderDocument, input: PurchaseOrderInput): void => {
  if (po.status === 'draft') return;
  if (po.status === 'sent') {
    if (input.vendorId && po.vendorId.toString() !== input.vendorId) {
      throw new PurchaseOrderError('Sent purchase orders can only be updated with notes', 400);
    }
    return;
  }
  if (po.status === 'partially_received') {
    if (input.vendorId && po.vendorId.toString() !== input.vendorId) {
      throw new PurchaseOrderError('Partially received purchase orders are notes-only', 400);
    }
    return;
  }
  throw new PurchaseOrderError('Purchase order cannot be edited in its current status', 400);
};

export const savePurchaseOrder = async (
  context: PurchaseOrderContext,
  input: PurchaseOrderInput,
  id?: string,
): Promise<PurchaseOrder> => {
  const tenantId = toObjectId(context.tenantId, 'tenant id');
  const vendorId = input.vendorId ? toObjectId(input.vendorId, 'vendor id') : undefined;
  if (!id) {
    if (!vendorId) {
      throw new PurchaseOrderError('Vendor is required', 400);
    }
    const po = await PurchaseOrderModel.create({
      tenantId,
      vendorId,
      notes: input.notes,
      status: input.status ?? 'draft',
      items: normalizeItems(input.items),
      auditTrail: [],
      subtotal: 0,
      receivedTotal: 0,
    });
    recalcTotals(po);
    addAudit(po, 'create', context.userId);
    await po.save();
    return serializePurchaseOrder(po);
  }
  const po = await ensurePurchaseOrder(context, id);
  assertEditable(po, input);
  po.notes = input.notes ?? po.notes;
  if (po.status === 'draft') {
    if (!vendorId) {
      throw new PurchaseOrderError('Vendor is required', 400);
    }
    po.vendorId = vendorId;
    po.items = normalizeItems(input.items);
    if (input.status && input.status !== po.status) {
      const allowed = ALLOWED_TRANSITIONS[po.status];
      if (!allowed.includes(input.status)) {
        throw new PurchaseOrderError('Invalid status transition', 400);
      }
      po.status = input.status;
    }
  }
  recalcTotals(po);
  addAudit(po, 'update', context.userId);
  await po.save();
  return serializePurchaseOrder(po);
};

const updateInventoryForReceipt = async (
  context: PurchaseOrderContext,
  partId: Types.ObjectId,
  quantity: number,
  unitCost?: number,
): Promise<void> => {
  const tenantId = toObjectId(context.tenantId, 'tenant id');
  const stock =
    (await PartStockModel.findOne({ tenantId, partId, siteId: context.siteId ? toObjectId(context.siteId, 'site id') : undefined })) ||
    (await PartStockModel.create({
      tenantId,
      partId,
      siteId: context.siteId ? toObjectId(context.siteId, 'site id') : undefined,
      onHand: 0,
      reserved: 0,
    }));

  stock.onHand = Number(stock.onHand ?? 0) + quantity;
  if (unitCost !== undefined) {
    stock.unitCost = unitCost;
  }
  await stock.save();

  await InventoryMovementModel.create({
    tenantId,
    siteId: context.siteId ? toObjectId(context.siteId, 'site id') : undefined,
    partId,
    stockId: stock._id,
    type: 'receive',
    quantity,
    onHandAfter: stock.onHand,
    reservedAfter: stock.reserved,
    createdBy: context.userId ? toObjectId(context.userId, 'user id') : undefined,
    metadata: { source: 'purchase-order' },
  });

  const part = await PartModel.findOne({ _id: partId, tenantId });
  if (part) {
    const currentQty = Number(part.quantity ?? 0);
    const newQty = currentQty + quantity;
    const currentAverage = Number((part as any).averageCost ?? part.unitCost ?? 0);
    if (unitCost !== undefined) {
      const nextAverage = newQty > 0 ? (currentAverage * currentQty + unitCost * quantity) / newQty : currentAverage;
      (part as any).averageCost = nextAverage;
      (part as any).lastCost = unitCost;
    }
    part.quantity = newQty;
    await part.save();
  }
};

const applyReceiptToItem = (
  item: PurchaseOrderItem,
  receiptQty: number,
  userId?: string,
  note?: string,
): void => {
  const nextQty = Math.min(item.quantity, item.received + receiptQty);
  const delta = nextQty - item.received;
  if (delta <= 0) {
    throw new PurchaseOrderError('Receipt exceeds ordered quantity', 400);
  }
  item.received = nextQty;
  item.backordered = Math.max(0, item.quantity - item.received);
  item.receipts = item.receipts ?? [];
  item.receipts.push({
    quantity: delta,
    receivedAt: new Date(),
    userId: userId ? toObjectId(userId, 'user id') : undefined,
    note,
  });
  if (item.received === item.quantity) {
    item.status = 'received';
  } else {
    item.status = item.received > 0 ? 'partial' : 'backordered';
  }
};

export const receivePurchaseOrder = async (
  context: PurchaseOrderContext,
  id: string,
  receipts: ReceiptInput[],
): Promise<PurchaseOrder> => {
  const po = await ensurePurchaseOrder(context, id);
  if (!['sent', 'partially_received'].includes(po.status)) {
    throw new PurchaseOrderError('Purchase order must be sent before receiving items', 400);
  }

  const validReceipts = receipts.filter((receipt) => receipt.quantity > 0);
  if (!validReceipts.length) {
    throw new PurchaseOrderError('At least one receipt line is required', 400);
  }

  await Promise.all(
    validReceipts.map(async (receipt) => {
      const partId = toObjectId(receipt.partId, 'part id');
      const line = po.items.find((item) => item.partId.toString() === receipt.partId);
      if (!line) {
        throw new PurchaseOrderError('Receipt item not found on purchase order', 400);
      }
      applyReceiptToItem(line, receipt.quantity, context.userId, receipt.note);
      await updateInventoryForReceipt(context, partId, receipt.quantity, line.unitCost);
    }),
  );

  const allReceived = po.items.every((item) => item.received >= item.quantity);
  po.status = allReceived ? 'received' : 'partially_received';
  recalcTotals(po);
  addAudit(po, 'receive', context.userId, `Received ${validReceipts.length} line(s)`);
  await po.save();
  return serializePurchaseOrder(po);
};

export const transitionPurchaseOrder = async (
  context: PurchaseOrderContext,
  id: string,
  status: PurchaseOrderStatus,
): Promise<PurchaseOrder> => {
  const po = await ensurePurchaseOrder(context, id);
  const allowed = ALLOWED_TRANSITIONS[po.status] ?? [];
  if (!allowed.includes(status)) {
    throw new PurchaseOrderError('Invalid status transition', 400);
  }
  po.status = status;
  addAudit(po, status === 'sent' ? 'send' : status === 'closed' ? 'close' : status === 'canceled' ? 'cancel' : 'update', context.userId);
  await po.save();
  return serializePurchaseOrder(po);
};

export const sendPurchaseOrder = async (
  context: PurchaseOrderContext,
  id: string,
  note?: string,
): Promise<PurchaseOrder> => {
  const po = await ensurePurchaseOrder(context, id);
  if (po.status !== 'draft') {
    throw new PurchaseOrderError('Only draft purchase orders can be sent', 400);
  }
  po.status = 'sent';
  addAudit(po, 'send', context.userId, note);
  await po.save();
  return serializePurchaseOrder(po);
};

export const closePurchaseOrder = async (context: PurchaseOrderContext, id: string): Promise<PurchaseOrder> => {
  const po = await ensurePurchaseOrder(context, id);
  if (!['received', 'partially_received', 'sent'].includes(po.status)) {
    throw new PurchaseOrderError('Purchase order cannot be closed in its current status', 400);
  }
  po.status = 'closed';
  addAudit(po, 'close', context.userId);
  await po.save();
  return serializePurchaseOrder(po);
};

export const cancelPurchaseOrder = async (context: PurchaseOrderContext, id: string): Promise<PurchaseOrder> => {
  const po = await ensurePurchaseOrder(context, id);
  if (['received', 'closed', 'canceled'].includes(po.status)) {
    throw new PurchaseOrderError('Purchase order cannot be canceled', 400);
  }
  po.status = 'canceled';
  addAudit(po, 'cancel', context.userId);
  await po.save();
  return serializePurchaseOrder(po);
};
