/*
 * SPDX-License-Identifier: MIT
 */

import { Schema, Types, model, type Document } from 'mongoose';

import {
  assertValidStatusTransition,
  deriveLineStatus,
  validateLineQuantities,
  validateMonetaryAmount,
} from '../validators/purchaseOrder';
import type { PurchaseOrderLineStatus, PurchaseOrderStatus } from '../validators/purchaseOrder';

export interface PurchaseOrderLine {
  partId: Types.ObjectId;
  description?: string;
  quantityOrdered: number;
  quantityReceived: number;
  unitCost: number;
  status: PurchaseOrderLineStatus;
  notes?: string;
}

export interface PurchaseOrderDocument extends Document {
  tenantId: Types.ObjectId;
  siteId?: Types.ObjectId | null;
  vendorId: Types.ObjectId;
  poNumber: string;
  status: PurchaseOrderStatus;
  lines: PurchaseOrderLine[];
  currency?: string;
  taxTotal?: number;
  shippingTotal?: number;
  subtotal?: number;
  notes?: string;
  expectedAt?: Date;
  issuedAt?: Date;
  deletedAt?: Date | null;
  deletedBy?: Types.ObjectId | null;
  created_at?: Date;
  updated_at?: Date;
}

const purchaseOrderLineSchema = new Schema<PurchaseOrderLine>(
  {
    partId: { type: Schema.Types.ObjectId, ref: 'Part', required: true },
    description: { type: String, trim: true },
    quantityOrdered: { type: Number, required: true, min: [1, 'Ordered quantity must be at least 1'] },
    quantityReceived: { type: Number, default: 0, min: [0, 'Received quantity cannot be negative'] },
    unitCost: { type: Number, default: 0, min: [0, 'Unit cost cannot be negative'] },
    status: {
      type: String,
      enum: ['open', 'partial', 'received'],
      default: 'open',
    },
    notes: { type: String },
  },
  { _id: false },
);

purchaseOrderLineSchema.pre('validate', function preValidate() {
  this.status = deriveLineStatus(this.quantityOrdered, this.quantityReceived);
});

const purchaseOrderSchema = new Schema<PurchaseOrderDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', index: true },
    vendorId: { type: Schema.Types.ObjectId, ref: 'VendorV2', required: true, index: true },
    poNumber: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['draft', 'pending', 'approved', 'sent', 'partially_received', 'received', 'closed', 'cancelled'],
      default: 'draft',
    },
    lines: { type: [purchaseOrderLineSchema], default: [] },
    currency: { type: String, trim: true },
    taxTotal: { type: Number, default: 0, min: [0, 'Tax must be non-negative'] },
    shippingTotal: { type: Number, default: 0, min: [0, 'Shipping must be non-negative'] },
    subtotal: { type: Number, default: 0, min: [0, 'Subtotal must be non-negative'] },
    notes: { type: String },
    expectedAt: { type: Date },
    issuedAt: { type: Date },
    deletedAt: { type: Date, default: null, index: true },
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

purchaseOrderSchema.post('init', function postInit(doc) {
  doc.$locals = doc.$locals ?? {};
  doc.$locals.originalStatus = doc.status;
});

purchaseOrderSchema.pre('validate', function preValidate() {
  this.lines = (this.lines ?? []).map((line) => ({
    ...line,
    status: deriveLineStatus(line.quantityOrdered, line.quantityReceived),
  }));

  this.lines.forEach((line, index) => {
    validateLineQuantities(line.quantityOrdered, line.quantityReceived, index);
  });

  validateMonetaryAmount(this.taxTotal ?? 0, 'Tax total');
  validateMonetaryAmount(this.shippingTotal ?? 0, 'Shipping total');
  validateMonetaryAmount(this.subtotal ?? 0, 'Subtotal');

  if (!this.status) {
    this.status = 'draft';
  }
  if (!this.isNew && this.isModified('status')) {
    const previousStatus = (this.$locals?.originalStatus ?? 'draft') as PurchaseOrderStatus;
    assertValidStatusTransition(previousStatus, this.status as PurchaseOrderStatus);
  }
});

purchaseOrderSchema.index({ tenantId: 1, poNumber: 1 }, { unique: true });
purchaseOrderSchema.index({ tenantId: 1, vendorId: 1 });
purchaseOrderSchema.index({ tenantId: 1, notes: 'text' });

export default model<PurchaseOrderDocument>('PurchaseOrderV4', purchaseOrderSchema);
