/*
 * SPDX-License-Identifier: MIT
 */

import { Schema, Types, model, type Document } from 'mongoose';

export interface StockLocationDocument extends Document {
  tenantId: Types.ObjectId;
  siteId?: Types.ObjectId;
  name: string;
  code: string;
  parent?: Types.ObjectId | null;
  materialized_path?: string;
  depth?: number;
  barcode?: string;
  tags?: string[];
  notes?: string;
  deleted_at?: Date | null;
  deleted_by?: Types.ObjectId;
  created_at?: Date;
  updated_at?: Date;
  created_by?: Types.ObjectId;
  updated_by?: Types.ObjectId;
}

const stockLocationSchema = new Schema<StockLocationDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true },
    parent: { type: Schema.Types.ObjectId, ref: 'InventoryStockLocation', default: null, index: true },
    materialized_path: { type: String, trim: true },
    depth: { type: Number, default: 0 },
    barcode: { type: String, trim: true },
    tags: [{ type: String, trim: true }],
    notes: { type: String },
    deleted_at: { type: Date, default: null, index: true },
    deleted_by: { type: Schema.Types.ObjectId, ref: 'User' },
    created_by: { type: Schema.Types.ObjectId, ref: 'User' },
    updated_by: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

stockLocationSchema.index({ tenantId: 1, code: 1 }, { unique: true, partialFilterExpression: { deleted_at: null } });
stockLocationSchema.index(
  { tenantId: 1, materialized_path: 1 },
  { unique: true, partialFilterExpression: { deleted_at: null, materialized_path: { $exists: true } } },
);
stockLocationSchema.index({ tenantId: 1, parent: 1, name: 1 }, { partialFilterExpression: { deleted_at: null } });
stockLocationSchema.index({ tenantId: 1, barcode: 1 }, { unique: true, partialFilterExpression: { deleted_at: null, barcode: { $exists: true } } });

export default model<StockLocationDocument>('InventoryStockLocation', stockLocationSchema);
