/*
 * SPDX-License-Identifier: MIT
 */

import { Schema, Types, model, type Document } from 'mongoose';

export interface PartStockDocument extends Document {
  tenantId: Types.ObjectId;
  siteId?: Types.ObjectId;
  part: Types.ObjectId;
  location: Types.ObjectId;
  quantity: number;
  reserved: number;
  reorder_point: number;
  reorder_qty: number;
  unit_cost?: number;
  tags?: string[];
  deleted_at?: Date | null;
  deleted_by?: Types.ObjectId;
  created_at?: Date;
  updated_at?: Date;
  created_by?: Types.ObjectId;
  updated_by?: Types.ObjectId;
}

const partStockSchema = new Schema<PartStockDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', index: true },
    part: { type: Schema.Types.ObjectId, ref: 'InventoryPart', required: true, index: true },
    location: { type: Schema.Types.ObjectId, ref: 'InventoryStockLocation', required: true, index: true },
    quantity: { type: Number, default: 0 },
    reserved: { type: Number, default: 0 },
    reorder_point: { type: Number, default: 0 },
    reorder_qty: { type: Number, default: 0 },
    unit_cost: { type: Number, default: 0 },
    tags: [{ type: String, trim: true }],
    deleted_at: { type: Date, default: null, index: true },
    deleted_by: { type: Schema.Types.ObjectId, ref: 'User' },
    created_by: { type: Schema.Types.ObjectId, ref: 'User' },
    updated_by: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

partStockSchema.index(
  { tenantId: 1, part: 1, location: 1 },
  { unique: true, partialFilterExpression: { deleted_at: null } },
);
partStockSchema.index({ tenantId: 1, location: 1, deleted_at: 1 });
partStockSchema.index({ tenantId: 1, part: 1, deleted_at: 1 });

export default model<PartStockDocument>('InventoryPartStock', partStockSchema);
