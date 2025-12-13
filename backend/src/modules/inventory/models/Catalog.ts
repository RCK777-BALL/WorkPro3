/*
 * SPDX-License-Identifier: MIT
 */

import { Schema, Types, model, type Document } from 'mongoose';

export interface CatalogEntry {
  part: Types.ObjectId;
  vendor?: Types.ObjectId;
  unitCost?: number;
  currency?: string;
}

export interface CatalogDocument extends Document {
  tenantId: Types.ObjectId;
  siteId?: Types.ObjectId;
  name: string;
  description?: string;
  entries: CatalogEntry[];
  defaultVendor?: Types.ObjectId;
}

const catalogSchema = new Schema<CatalogDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', index: true },
    name: { type: String, required: true, trim: true },
    description: String,
    entries: [
      {
        part: { type: Schema.Types.ObjectId, ref: 'InventoryPart', required: true },
        vendor: { type: Schema.Types.ObjectId, ref: 'InventoryVendor' },
        unitCost: Number,
        currency: String,
      },
    ],
    defaultVendor: { type: Schema.Types.ObjectId, ref: 'InventoryVendor' },
  },
  { timestamps: true },
);

catalogSchema.index({ tenantId: 1, name: 1 }, { unique: true });

export default model<CatalogDocument>('InventoryCatalog', catalogSchema);
