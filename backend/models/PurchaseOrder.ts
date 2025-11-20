/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, Types, Document } from 'mongoose';

export interface IPurchaseOrderLine {
  part: Types.ObjectId;
  qtyOrdered: number;
  qtyReceived: number;
  price: number;
}

export interface IPurchaseOrder extends Document {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  siteId?: Types.ObjectId;
  poNumber?: string;
  vendorId?: Types.ObjectId;
  vendor?: Types.ObjectId;
  lines: IPurchaseOrderLine[];
  status: 'Draft' | 'Pending' | 'Approved' | 'Ordered' | 'Received' | 'Closed';
  createdAt?: Date;
  updatedAt?: Date;
}

const purchaseOrderSchema = new Schema<IPurchaseOrder>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', index: true },
    poNumber: { type: String, index: true },
    vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor' },
    lines: [
      {
        part: { type: Schema.Types.ObjectId, ref: 'Part', required: true },
        qtyOrdered: { type: Number, required: true },
        qtyReceived: { type: Number, default: 0 },
        price: { type: Number, default: 0 },
      },
    ],
    status: {
      type: String,
      enum: ['Draft', 'Pending', 'Approved', 'Ordered', 'Received', 'Closed'],
      default: 'Draft',
    },
  },
  { timestamps: true }
);

export default mongoose.model<IPurchaseOrder>('PurchaseOrder', purchaseOrderSchema);
