/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, Types, type Document } from 'mongoose';

export interface StockItemDocument extends Document {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  siteId?: Types.ObjectId;
  part: Types.ObjectId;
  location: Types.ObjectId;
  quantity: number;
  unitCost?: number;
}

const stockItemSchema = new Schema<StockItemDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', index: true },
    part: { type: Schema.Types.ObjectId, ref: 'Part', required: true, index: true },
    location: { type: Schema.Types.ObjectId, ref: 'Location', required: true },
    quantity: { type: Number, default: 0 },
    unitCost: { type: Number, default: 0 },
  },
  { timestamps: true },
);

stockItemSchema.index({ tenantId: 1, part: 1, location: 1 }, { unique: true });

export default mongoose.model<StockItemDocument>('StockItem', stockItemSchema);
