/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, type Document, type Model, Types } from 'mongoose';

export type PurchaseRequestStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'fulfilled';

export interface PurchaseRequestItem {
  partId: Types.ObjectId;
  quantity: number;
  notes?: string;
}

export interface PurchaseRequestDocument extends Document {
  tenantId: Types.ObjectId;
  requesterId?: Types.ObjectId;
  siteId?: Types.ObjectId;
  status: PurchaseRequestStatus;
  items: PurchaseRequestItem[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const purchaseRequestItemSchema = new Schema<PurchaseRequestItem>(
  {
    partId: { type: Schema.Types.ObjectId, ref: 'Part', required: true },
    quantity: { type: Number, required: true, min: 1 },
    notes: { type: String },
  },
  { _id: false },
);

const purchaseRequestSchema = new Schema<PurchaseRequestDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    requesterId: { type: Schema.Types.ObjectId, ref: 'User' },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site' },
    status: { type: String, required: true, default: 'draft' },
    items: { type: [purchaseRequestItemSchema], default: [] },
    notes: { type: String },
  },
  { timestamps: true },
);

purchaseRequestSchema.index({ tenantId: 1, status: 1, createdAt: -1 });

const PurchaseRequest: Model<PurchaseRequestDocument> = mongoose.model<PurchaseRequestDocument>(
  'PurchaseRequest',
  purchaseRequestSchema,
);

export default PurchaseRequest;
