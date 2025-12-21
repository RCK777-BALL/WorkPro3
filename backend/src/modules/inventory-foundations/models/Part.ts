/*
 * SPDX-License-Identifier: MIT
 */

import { Schema, Types, model, type Document } from 'mongoose';

export interface PartDocument extends Document {
  tenantId: Types.ObjectId;
  siteId?: Types.ObjectId | null;
  name: string;
  description?: string;
  sku?: string;
  barcode?: string;
  unitOfMeasure?: string;
  unitCost?: number;
  reorderPoint?: number;
  reorderQty?: number;
  preferredVendorId?: Types.ObjectId;
  tags: string[];
  attachments?: { name?: string; url?: string }[];
  deletedAt?: Date | null;
  created_at?: Date;
  updated_at?: Date;
}

const attachmentSchema = new Schema<{ name?: string; url?: string }>(
  {
    name: { type: String },
    url: { type: String },
  },
  { _id: false },
);

const partSchema = new Schema<PartDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String },
    sku: { type: String, index: true },
    barcode: { type: String, index: true },
    unitOfMeasure: { type: String },
    unitCost: { type: Number, default: 0 },
    reorderPoint: { type: Number, default: 0 },
    reorderQty: { type: Number, default: 0 },
    preferredVendorId: { type: Schema.Types.ObjectId, ref: 'Vendor' },
    tags: { type: [String], default: [] },
    attachments: { type: [attachmentSchema], default: [] },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

partSchema.index({ tenantId: 1, name: 1 });
partSchema.index({ tenantId: 1, sku: 1 });
partSchema.index({ tenantId: 1, barcode: 1 });
partSchema.index({ tenantId: 1, tags: 1 });

export default model<PartDocument>('InventoryPartV2', partSchema);
