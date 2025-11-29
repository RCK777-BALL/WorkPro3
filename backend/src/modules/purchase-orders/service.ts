/*
 * SPDX-License-Identifier: MIT
 */

import { Types } from 'mongoose';
import PartModel from '../inventory/models/Part';
import type { PurchaseOrder, PurchaseOrderInput, ReceiptInput } from './types';
import PurchaseOrderModel, {
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
}

const ALLOWED_TRANSITIONS: Record<PurchaseOrderStatus, PurchaseOrderStatus[]> = {
  draft: ['pending'],
  pending: ['approved'],
  approved: ['received'],
  received: [],
};

const toObjectId = (value: string, label: string): Types.ObjectId => {
  if (!Types.ObjectId.isValid(value)) {
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

const serializePurchaseOrder = (po: PurchaseOrderDocument): PurchaseOrder => ({
  id: (po._id as Types.ObjectId).toString(),
  vendorId: po.vendorId.toString(),
  status: po.status,
  items: po.items.map((item) => ({
    partId: item.partId.toString(),
    quantity: item.quantity,
    unitCost: item.unitCost,
    received: item.received,
    status: item.status,
  })),
  totalCost: po.totalCost,
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
    status: 'open',
  }));

export const savePurchaseOrder = async (
  context: PurchaseOrderContext,
  input: PurchaseOrderInput,
  id?: string,
): Promise<PurchaseOrder> => {
  const tenantId = toObjectId(context.tenantId, 'tenant id');
  const vendorId = toObjectId(input.vendorId, 'vendor id');
  if (!id) {
    const po = await PurchaseOrderModel.create({
      tenantId,
      vendorId,
      status: input.status ?? 'draft',
      items: normalizeItems(input.items),
    });
    return serializePurchaseOrder(po);
  }
  const po = await ensurePurchaseOrder(context, id);
  if (po.status !== 'draft' && po.status !== 'pending') {
    throw new PurchaseOrderError('Only draft or pending orders can be edited', 400);
  }
  po.vendorId = vendorId;
  po.items = normalizeItems(input.items);
  if (input.status && po.status !== input.status) {
    const allowed = ALLOWED_TRANSITIONS[po.status];
    if (!allowed.includes(input.status)) {
      throw new PurchaseOrderError('Invalid status transition', 400);
    }
    po.status = input.status;
  }
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
  await po.save();
  return serializePurchaseOrder(po);
};

const applyReceiptToItem = (item: PurchaseOrderItem, receiptQty: number): void => {
  const nextQty = Math.min(item.quantity, item.received + receiptQty);
  item.received = nextQty;
  if (nextQty === item.quantity) {
    item.status = 'received';
  } else if (nextQty > 0) {
    item.status = 'partial';
  }
};

export const receivePurchaseOrder = async (
  context: PurchaseOrderContext,
  id: string,
  receipts: ReceiptInput[],
): Promise<PurchaseOrder> => {
  const po = await ensurePurchaseOrder(context, id);
  if (po.status !== 'approved' && po.status !== 'received') {
    throw new PurchaseOrderError('Purchase order must be approved before receiving items', 400);
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
      applyReceiptToItem(line, receipt.quantity);
      const part = await PartModel.findOne({ _id: partId, tenantId: context.tenantId });
      if (part) {
        part.quantity = (part.quantity ?? 0) + receipt.quantity;
        await part.save();
      }
    }),
  );

  const allReceived = po.items.every((item) => item.received >= item.quantity);
  po.status = allReceived ? 'received' : po.status;
  await po.save();
  return serializePurchaseOrder(po);
};
