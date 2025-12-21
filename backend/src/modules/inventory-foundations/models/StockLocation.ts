/*
 * SPDX-License-Identifier: MIT
 */

import { Schema, Types, model, type Document } from 'mongoose';

export interface StockLocationDocument extends Document {
  tenantId: Types.ObjectId;
  siteId?: Types.ObjectId | null;
  name: string;
  code?: string;
  parentId?: Types.ObjectId | null;
  tags: string[];
  deletedAt?: Date | null;
  created_at?: Date;
  updated_at?: Date;
}

const stockLocationSchema = new Schema<StockLocationDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, trim: true },
    parentId: { type: Schema.Types.ObjectId, ref: 'InventoryStockLocation' },
    tags: { type: [String], default: [] },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

stockLocationSchema.index({ tenantId: 1, name: 1 });
stockLocationSchema.index({ tenantId: 1, code: 1 });
stockLocationSchema.index({ tenantId: 1, parentId: 1 });
stockLocationSchema.index({ tenantId: 1, tags: 1 });

export default model<StockLocationDocument>('InventoryStockLocation', stockLocationSchema);
