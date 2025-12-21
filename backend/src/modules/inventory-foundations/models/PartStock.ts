/*
 * SPDX-License-Identifier: MIT
 */

import { Schema, Types, model, type Document } from 'mongoose';

export interface PartStockDocument extends Document {
  tenantId: Types.ObjectId;
  partId: Types.ObjectId;
  locationId: Types.ObjectId;
  siteId?: Types.ObjectId | null;
  onHand: number;
  reserved: number;
  minQty?: number;
  maxQty?: number;
  tags: string[];
  recountNote?: string;
  recountedAt?: Date;
  recountedBy?: Types.ObjectId;
  deletedAt?: Date | null;
  created_at?: Date;
  updated_at?: Date;
}

const partStockSchema = new Schema<PartStockDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    partId: { type: Schema.Types.ObjectId, ref: 'InventoryPartV2', required: true },
    locationId: { type: Schema.Types.ObjectId, ref: 'InventoryStockLocation', required: true },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', index: true },
    onHand: { type: Number, default: 0 },
    reserved: { type: Number, default: 0 },
    minQty: { type: Number },
    maxQty: { type: Number },
    tags: { type: [String], default: [] },
    recountNote: { type: String },
    recountedAt: { type: Date },
    recountedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

partStockSchema.index({ tenantId: 1, partId: 1, locationId: 1 }, { unique: true });
partStockSchema.index({ tenantId: 1, tags: 1 });

export default model<PartStockDocument>('InventoryPartStock', partStockSchema);
