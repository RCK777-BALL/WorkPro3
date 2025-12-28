/*
 * SPDX-License-Identifier: MIT
 */

import { Schema, Types, model, type Document } from 'mongoose';

export interface VendorPricingTier {
  partId: Types.ObjectId;
  minQty: number;
  maxQty?: number;
  unitCost: number;
  currency?: string;
  leadTimeDays?: number;
}

export interface VendorDocument extends Document {
  tenantId: Types.ObjectId;
  name: string;
  leadTimeDays?: number;
  notes?: string;
  pricingTiers: VendorPricingTier[];
  partsSupplied: Types.ObjectId[];
  created_at?: Date;
  updated_at?: Date;
}

const pricingTierSchema = new Schema<VendorPricingTier>(
  {
    partId: { type: Schema.Types.ObjectId, ref: 'InventoryPart', required: true },
    minQty: { type: Number, default: 0 },
    maxQty: { type: Number },
    unitCost: { type: Number, required: true },
    currency: { type: String, trim: true },
    leadTimeDays: { type: Number, min: 0 },
  },
  { _id: false },
);

const vendorSchema = new Schema<VendorDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true, trim: true },
    leadTimeDays: { type: Number, default: 0, min: 0 },
    notes: { type: String },
    pricingTiers: { type: [pricingTierSchema], default: [] },
    partsSupplied: [{ type: Schema.Types.ObjectId, ref: 'InventoryPart' }],
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

vendorSchema.index({ tenantId: 1, name: 1 });

export default model<VendorDocument>('VendorManagement', vendorSchema);
