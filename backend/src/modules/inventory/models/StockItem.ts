/*
 * SPDX-License-Identifier: MIT
 */

import { Schema, Types, model, type Document } from 'mongoose';

export interface StockItemDocument extends Document {
  tenantId: Types.ObjectId;
  siteId?: Types.ObjectId | undefined;
  part: Types.ObjectId;
  location: Types.ObjectId;
  quantity: number;
  unitCost?: number | undefined;
  unit?: string | undefined;
  cost?: number | undefined;
}

const stockItemSchema = new Schema<StockItemDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', index: true },
    part: { type: Schema.Types.ObjectId, ref: 'InventoryPart', required: true },
    location: { type: Schema.Types.ObjectId, ref: 'InventoryLocation', required: true },
    quantity: { type: Number, default: 0 },
    unitCost: { type: Number, default: 0 },
    unit: String,
    cost: { type: Number, default: 0 },
  },
  { timestamps: true },
);

stockItemSchema.index({ tenantId: 1, part: 1, location: 1 }, { unique: true });

export default model<StockItemDocument>('InventoryStockItem', stockItemSchema);
