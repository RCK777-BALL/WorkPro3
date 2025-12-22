/*
 * SPDX-License-Identifier: MIT
 */

import { Schema, Types, model, type Document } from 'mongoose';

export type PurchaseOrderStatus =
  | 'draft'
  | 'sent'
  | 'partially_received'
  | 'received'
  | 'closed'
  | 'canceled';
export type PurchaseOrderItemStatus = 'open' | 'partial' | 'received' | 'backordered';

export interface PurchaseOrderAuditEntry {
  action: 'create' | 'update' | 'send' | 'receive' | 'close' | 'cancel';
  at: Date;
  userId?: Types.ObjectId;
  note?: string;
}

export interface PurchaseOrderReceiptEntry {
  quantity: number;
  receivedAt: Date;
  userId?: Types.ObjectId;
  note?: string;
}

export interface PurchaseOrderItem {
  partId: Types.ObjectId;
  quantity: number;
  unitCost?: number | undefined;
  received: number;
  receipts?: PurchaseOrderReceiptEntry[];
  backordered?: number;
  status: PurchaseOrderItemStatus;
}

export interface PurchaseOrderDocument extends Document {
  tenantId: Types.ObjectId;
  vendorId: Types.ObjectId;
  notes?: string;
  status: PurchaseOrderStatus;
  items: PurchaseOrderItem[];
  auditTrail: PurchaseOrderAuditEntry[];
  subtotal: number;
  receivedTotal: number;
  createdAt?: Date;
  updatedAt?: Date;
  totalCost: number;
}

const purchaseOrderSchema = new Schema<PurchaseOrderDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true },
    notes: { type: String },
    status: {
      type: String,
      enum: ['draft', 'sent', 'partially_received', 'received', 'closed', 'canceled'],
      default: 'draft',
    },
    items: [
      {
        partId: { type: Schema.Types.ObjectId, ref: 'InventoryPart', required: true },
        quantity: { type: Number, required: true },
        unitCost: { type: Number },
        received: { type: Number, default: 0 },
        receipts: [
          {
            quantity: { type: Number, required: true },
            receivedAt: { type: Date, default: Date.now },
            userId: { type: Schema.Types.ObjectId, ref: 'User' },
            note: { type: String },
          },
        ],
        backordered: { type: Number, default: 0 },
        status: { type: String, enum: ['open', 'partial', 'received', 'backordered'], default: 'open' },
      },
    ],
    auditTrail: [
      {
        action: {
          type: String,
          enum: ['create', 'update', 'send', 'receive', 'close', 'cancel'],
          required: true,
        },
        at: { type: Date, default: Date.now },
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
        note: { type: String },
      },
    ],
    subtotal: { type: Number, default: 0 },
    receivedTotal: { type: Number, default: 0 },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

purchaseOrderSchema.virtual('totalCost').get(function virtualTotalCost(this: PurchaseOrderDocument) {
  return (this.items ?? []).reduce((sum, item) => sum + item.quantity * (item.unitCost ?? 0), 0);
});

export default model<PurchaseOrderDocument>('PurchaseOrderV3', purchaseOrderSchema);
