/*
 * SPDX-License-Identifier: MIT
 */

import { Schema, Types, model, type Document } from 'mongoose';

export type PurchasingStatus = 'draft' | 'sent' | 'received';

export interface PurchasingItem {
  partId: Types.ObjectId;
  quantity: number;
  unitCost?: number;
}

export interface PurchasingDocument extends Document {
  tenantId: Types.ObjectId;
  vendorId: Types.ObjectId;
  status: PurchasingStatus;
  items: PurchasingItem[];
  notes?: string;
  sentAt?: Date;
  receivedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const purchaseOrderSchema = new Schema<PurchasingDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    vendorId: { type: Schema.Types.ObjectId, ref: 'VendorManagement', required: true },
    status: { type: String, enum: ['draft', 'sent', 'received'], default: 'draft' },
    items: [
      {
        partId: { type: Schema.Types.ObjectId, ref: 'InventoryPart', required: true },
        quantity: { type: Number, required: true },
        unitCost: { type: Number },
      },
    ],
    notes: { type: String },
    sentAt: { type: Date },
    receivedAt: { type: Date },
  },
  { timestamps: true },
);

purchaseOrderSchema.index({ tenantId: 1, status: 1, createdAt: -1 });

export default model<PurchasingDocument>('PurchasingOrder', purchaseOrderSchema);
