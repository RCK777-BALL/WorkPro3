/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, Types, Document } from 'mongoose';

export interface IPurchaseOrderItem {
  item: Types.ObjectId;
  quantity: number;
  uom?: Types.ObjectId;
  unitCost?: number;
  received: number;
}

export interface IPurchaseOrder extends Document<IPurchaseOrder> {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  vendor: Types.ObjectId;
  items: IPurchaseOrderItem[];
  status: 'open' | 'acknowledged' | 'shipped' | 'closed';
}

const purchaseOrderSchema = new Schema<IPurchaseOrder>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    vendor: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true },
    items: [
      {
        item: { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
        quantity: { type: Number, required: true },
        uom: { type: Schema.Types.ObjectId, ref: 'unitOfMeasure' },
        unitCost: Number,
        received: { type: Number, default: 0 },
      },
    ],
    status: {
      type: String,
      enum: ['open', 'acknowledged', 'shipped', 'closed'],
      default: 'open',
    },
  },
  { timestamps: true }
);

export default mongoose.model<IPurchaseOrder>('PurchaseOrder', purchaseOrderSchema);
