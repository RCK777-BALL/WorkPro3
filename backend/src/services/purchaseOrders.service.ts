/*
 * SPDX-License-Identifier: MIT
 */

import { Types } from 'mongoose';
import PurchaseOrder from '../models/PurchaseOrder';
import PartStock from '../models/PartStock';
import type {
  PurchaseOrderInput,
  PurchaseOrderUpdateInput,
} from '../../../shared/validators/purchaseOrder';
import { writeAuditEvent } from './audit.service';

export interface PurchaseOrderListResult {
  items: unknown[];
  total: number;
  page: number;
  limit: number;
}

export const listPurchaseOrders = async (
  tenantId: string,
  query: { status?: string; vendorId?: string; page: number; limit: number },
): Promise<PurchaseOrderListResult> => {
  const filter: Record<string, unknown> = { tenantId: new Types.ObjectId(tenantId) };
  if (query.status) filter.status = query.status;
  if (query.vendorId) filter.vendorId = new Types.ObjectId(query.vendorId);

  const [items, total] = await Promise.all([
    PurchaseOrder.find(filter)
      .sort({ updated_at: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .lean(),
    PurchaseOrder.countDocuments(filter),
  ]);

  return { items, total, page: query.page, limit: query.limit };
};

const buildPurchaseOrderLines = (input: PurchaseOrderInput) =>
  input.lines.map((line: PurchaseOrderInput['lines'][number]) => ({
    part: new Types.ObjectId(line.partId),
    qtyOrdered: line.quantity,
    qtyReceived: 0,
    price: line.unitCost,
  }));

const calculateSubtotal = (input: PurchaseOrderInput) =>
  input.lines.reduce(
    (sum: number, line: PurchaseOrderInput['lines'][number]) => sum + line.quantity * line.unitCost,
    0,
  );

export const createPurchaseOrder = async (tenantId: string, input: PurchaseOrderInput) => {
  const poNumber = `PO-${Date.now()}`;
  const doc = await PurchaseOrder.create({
    tenantId: new Types.ObjectId(tenantId),
    vendorId: new Types.ObjectId(input.vendorId),
    poNumber,
    status: input.status ?? 'draft',
    lines: buildPurchaseOrderLines(input),
    subtotal: calculateSubtotal(input),
    taxTotal: input.lines.reduce(
      (sum: number, line: PurchaseOrderInput['lines'][number]) => sum + (line.tax ?? 0),
      0,
    ),
    shippingTotal: input.lines.reduce(
      (sum: number, line: PurchaseOrderInput['lines'][number]) => sum + (line.fees ?? 0),
      0,
    ),
    notes: input.notes,
    expectedAt: input.expectedDate ? new Date(input.expectedDate) : undefined,
  });

  await writeAuditEvent({
    tenantId,
    action: 'purchase_order.created',
    entityType: 'PurchaseOrder',
    entityId: doc._id.toString(),
    after: doc.toObject(),
  });

  return doc.toObject();
};

export const updatePurchaseOrder = async (tenantId: string, id: string, input: PurchaseOrderUpdateInput) => {
  const patch: Record<string, unknown> = {};
  if (input.status) patch.status = input.status;
  if (input.notes !== undefined) patch.notes = input.notes;
  if (input.expectedDate) patch.expectedAt = new Date(input.expectedDate);

  if (input.lines) {
    patch.lines = input.lines.map((line: PurchaseOrderInput['lines'][number]) => ({
      part: new Types.ObjectId(line.partId),
      qtyOrdered: line.quantity,
      qtyReceived: 0,
      price: line.unitCost,
    }));
    patch.subtotal = calculateSubtotal({ ...input, lines: input.lines } as PurchaseOrderInput);
  }

  const updated = await PurchaseOrder.findOneAndUpdate(
    { _id: id, tenantId: new Types.ObjectId(tenantId) },
    { $set: patch },
    { new: true },
  ).lean();

  if (updated) {
    await writeAuditEvent({
      tenantId,
      action: 'purchase_order.updated',
      entityType: 'PurchaseOrder',
      entityId: id,
      after: updated,
    });
  }

  return updated;
};

export const receivePurchaseOrder = async (
  tenantId: string,
  id: string,
  receipts: Array<{ partId: string; quantity: number }>,
) => {
  const purchaseOrder = await PurchaseOrder.findOne({ _id: id, tenantId: new Types.ObjectId(tenantId) });
  if (!purchaseOrder) return null;

  receipts.forEach((receipt) => {
    const line = purchaseOrder.lines.find((entry) => entry.part.toString() === receipt.partId);
    if (!line) return;
    const newReceived = line.qtyReceived + receipt.quantity;
    if (newReceived > line.qtyOrdered) {
      throw new Error('Cannot receive more than ordered');
    }
    line.qtyReceived = newReceived;
  });

  await purchaseOrder.save();

  await Promise.all(
    receipts.map((receipt) =>
      PartStock.findOneAndUpdate(
        { tenantId: new Types.ObjectId(tenantId), partId: new Types.ObjectId(receipt.partId) },
        { $inc: { onHand: receipt.quantity } },
        { upsert: true, new: true },
      ),
    ),
  );

  await writeAuditEvent({
    tenantId,
    action: 'purchase_order.received',
    entityType: 'PurchaseOrder',
    entityId: purchaseOrder._id.toString(),
    after: purchaseOrder.toObject(),
  });

  return purchaseOrder.toObject();
};

export const deletePurchaseOrder = async (tenantId: string, id: string) => {
  await PurchaseOrder.deleteOne({ _id: id, tenantId: new Types.ObjectId(tenantId) });
};
