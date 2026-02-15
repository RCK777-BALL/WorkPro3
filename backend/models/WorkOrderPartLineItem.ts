/*
 * SPDX-License-Identifier: MIT
 */

import { Schema, Types, model, type Document } from 'mongoose';

export interface WorkOrderPartLineItemDocument extends Document {
  tenantId: Types.ObjectId;
  siteId?: Types.ObjectId;
  workOrderId: Types.ObjectId;
  partId: Types.ObjectId;
  stockId?: Types.ObjectId;
  qtyReserved: number;
  qtyIssued: number;
  unitCost: number;
  totalCost: number;
  deletedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const workOrderPartLineItemSchema = new Schema<WorkOrderPartLineItemDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', index: true },
    workOrderId: { type: Schema.Types.ObjectId, ref: 'WorkOrder', required: true, index: true },
    partId: { type: Schema.Types.ObjectId, ref: 'InventoryPart', required: true, index: true },
    stockId: { type: Schema.Types.ObjectId, ref: 'PartStock', index: true },
    qtyReserved: { type: Number, default: 0 },
    qtyIssued: { type: Number, default: 0 },
    unitCost: { type: Number, default: 0 },
    totalCost: { type: Number, default: 0 },
    deletedAt: { type: Date, index: true },
  },
  { timestamps: true },
);

workOrderPartLineItemSchema.index(
  { tenantId: 1, workOrderId: 1, partId: 1, stockId: 1 },
  { unique: true, partialFilterExpression: { deletedAt: { $exists: false } } },
);

workOrderPartLineItemSchema.pre('save', function computeTotals() {
  const qtyIssued = Number(this.qtyIssued ?? 0) || 0;
  const unitCost = Number(this.unitCost ?? 0) || 0;
  this.totalCost = qtyIssued * unitCost;
});

export default model<WorkOrderPartLineItemDocument>('WorkOrderPartLineItem', workOrderPartLineItemSchema);
