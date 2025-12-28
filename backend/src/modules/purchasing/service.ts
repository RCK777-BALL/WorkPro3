/*
 * SPDX-License-Identifier: MIT
 */

import { Types } from 'mongoose';

import { logAuditEntry } from '../audit';
import PurchaseOrderModel, { type PurchasingDocument, type PurchasingStatus } from './model';

export interface PurchasingContext {
  tenantId: string;
  userId?: string;
}

export interface PurchasingItemInput {
  partId: string;
  quantity: number;
  unitCost?: number;
}

export interface PurchasingInput {
  vendorId: string;
  notes?: string;
  items: PurchasingItemInput[];
}

export interface PurchasingResponse {
  id: string;
  tenantId: string;
  vendorId: string;
  status: PurchasingStatus;
  notes?: string;
  items: PurchasingItemInput[];
  sentAt?: string;
  receivedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

const toObjectId = (value: string, label: string): Types.ObjectId => {
  if (!Types.ObjectId.isValid(value)) {
    throw new Error(`Invalid ${label}`);
  }
  return new Types.ObjectId(value);
};

const serializePurchaseOrder = (po: PurchasingDocument): PurchasingResponse => ({
  id: (po._id as Types.ObjectId).toString(),
  tenantId: po.tenantId.toString(),
  vendorId: po.vendorId.toString(),
  status: po.status,
  notes: po.notes ?? undefined,
  items: (po.items ?? []).map((item) => ({
    partId: item.partId.toString(),
    quantity: item.quantity,
    unitCost: item.unitCost,
  })),
  sentAt: po.sentAt?.toISOString(),
  receivedAt: po.receivedAt?.toISOString(),
  createdAt: po.createdAt?.toISOString(),
  updatedAt: po.updatedAt?.toISOString(),
});

const normalizeItems = (items: PurchasingItemInput[]): PurchasingDocument['items'] =>
  items.map((item) => ({
    partId: toObjectId(item.partId, 'part id'),
    quantity: item.quantity,
    unitCost: item.unitCost,
  }));

export const listPurchaseOrders = async (context: PurchasingContext): Promise<PurchasingResponse[]> => {
  const tenantId = toObjectId(context.tenantId, 'tenant id');
  const orders = await PurchaseOrderModel.find({ tenantId }).sort({ createdAt: -1 });
  return orders.map((order) => serializePurchaseOrder(order));
};

export const createPurchaseOrder = async (
  context: PurchasingContext,
  input: PurchasingInput,
): Promise<PurchasingResponse> => {
  const tenantId = toObjectId(context.tenantId, 'tenant id');
  const vendorId = toObjectId(input.vendorId, 'vendor id');
  const order = await PurchaseOrderModel.create({
    tenantId,
    vendorId,
    status: 'draft',
    items: normalizeItems(input.items),
    notes: input.notes,
  });
  await logAuditEntry({
    tenantId: context.tenantId,
    module: 'purchasing',
    action: 'draft_created',
    entityType: 'PurchasingOrder',
    entityId: (order._id as Types.ObjectId).toString(),
    actorId: context.userId,
  });
  return serializePurchaseOrder(order);
};

export const sendPurchaseOrder = async (
  context: PurchasingContext,
  id: string,
): Promise<PurchasingResponse> => {
  const tenantId = toObjectId(context.tenantId, 'tenant id');
  const order = await PurchaseOrderModel.findOne({ _id: toObjectId(id, 'purchase order id'), tenantId });
  if (!order) {
    throw new Error('Purchase order not found');
  }
  if (order.status !== 'draft') {
    throw new Error('Only draft purchase orders can be sent');
  }
  order.status = 'sent';
  order.sentAt = new Date();
  await order.save();
  await logAuditEntry({
    tenantId: context.tenantId,
    module: 'purchasing',
    action: 'sent',
    entityType: 'PurchasingOrder',
    entityId: (order._id as Types.ObjectId).toString(),
    actorId: context.userId,
  });
  return serializePurchaseOrder(order);
};

export const receivePurchaseOrder = async (
  context: PurchasingContext,
  id: string,
): Promise<PurchasingResponse> => {
  const tenantId = toObjectId(context.tenantId, 'tenant id');
  const order = await PurchaseOrderModel.findOne({ _id: toObjectId(id, 'purchase order id'), tenantId });
  if (!order) {
    throw new Error('Purchase order not found');
  }
  if (order.status !== 'sent') {
    throw new Error('Only sent purchase orders can be received');
  }
  order.status = 'received';
  order.receivedAt = new Date();
  await order.save();
  await logAuditEntry({
    tenantId: context.tenantId,
    module: 'purchasing',
    action: 'received',
    entityType: 'PurchasingOrder',
    entityId: (order._id as Types.ObjectId).toString(),
    actorId: context.userId,
  });
  return serializePurchaseOrder(order);
};
