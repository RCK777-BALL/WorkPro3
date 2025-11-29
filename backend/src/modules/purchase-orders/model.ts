/*
 * SPDX-License-Identifier: MIT
 */

import { Schema, Types, model, type Document } from 'mongoose';

export type PurchaseOrderStatus = 'draft' | 'pending' | 'approved' | 'received';
export type PurchaseOrderItemStatus = 'open' | 'partial' | 'received';

export interface PurchaseOrderItem {
  partId: Types.ObjectId;
  quantity: number;
  unitCost?: number | undefined;
  received: number;
  status: PurchaseOrderItemStatus;
}

export interface PurchaseOrderDocument extends Document {
  tenantId: Types.ObjectId;
  vendorId: Types.ObjectId;
  status: PurchaseOrderStatus;
  items: PurchaseOrderItem[];
  createdAt?: Date;
  updatedAt?: Date;
  totalCost: number;
}

const purchaseOrderSchema = new Schema<PurchaseOrderDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true },
    status: {
      type: String,
      enum: ['draft', 'pending', 'approved', 'received'],
      default: 'draft',
    },
    items: [
      {
        partId: { type: Schema.Types.ObjectId, ref: 'InventoryPart', required: true },
        quantity: { type: Number, required: true },
        unitCost: { type: Number },
        received: { type: Number, default: 0 },
        status: { type: String, enum: ['open', 'partial', 'received'], default: 'open' },
      },
    ],
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

purchaseOrderSchema.virtual('totalCost').get(function virtualTotalCost(this: PurchaseOrderDocument) {
  return (this.items ?? []).reduce((sum, item) => sum + item.quantity * (item.unitCost ?? 0), 0);
});

export default model<PurchaseOrderDocument>('PurchaseOrderV3', purchaseOrderSchema);
