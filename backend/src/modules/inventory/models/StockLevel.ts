/*
 * SPDX-License-Identifier: MIT
 */

import { Schema, Types, model, type Document } from 'mongoose';

export interface StockLevelDocument extends Document {
  tenantId: Types.ObjectId;
  siteId?: Types.ObjectId;
  part: Types.ObjectId;
  bin: Types.ObjectId;
  on_hand: number;
  allocated: number;
  reorder_point: number;
  reorder_qty: number;
  created_at?: Date;
  updated_at?: Date;
  created_by?: Types.ObjectId;
  updated_by?: Types.ObjectId;
}

const stockLevelSchema = new Schema<StockLevelDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', index: true },
    part: { type: Schema.Types.ObjectId, ref: 'InventoryPart', required: true, index: true },
    bin: { type: Schema.Types.ObjectId, ref: 'InventoryLocation', required: true, index: true },
    on_hand: { type: Number, default: 0 },
    allocated: { type: Number, default: 0 },
    reorder_point: { type: Number, default: 0 },
    reorder_qty: { type: Number, default: 0 },
    created_by: { type: Schema.Types.ObjectId, ref: 'User' },
    updated_by: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  },
);

stockLevelSchema.index({ tenantId: 1, part: 1, bin: 1 }, { unique: true });
stockLevelSchema.index({ tenantId: 1, part: 1 });
stockLevelSchema.index({ tenantId: 1, bin: 1 });

export default model<StockLevelDocument>('InventoryStockLevel', stockLevelSchema);
