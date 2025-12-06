/*
 * SPDX-License-Identifier: MIT
 */

import { Schema, Types, model, type Document } from 'mongoose';

export interface VendorPriceListDocument extends Document {
  tenantId: Types.ObjectId;
  siteId?: Types.ObjectId;
  vendor: Types.ObjectId;
  part: Types.ObjectId;
  unitCost: number;
  currency?: string;
  leadTimeDays?: number;
  effectiveDate?: Date;
}

const vendorPriceListSchema = new Schema<VendorPriceListDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', index: true },
    vendor: { type: Schema.Types.ObjectId, ref: 'InventoryVendor', required: true },
    part: { type: Schema.Types.ObjectId, ref: 'InventoryPart', required: true },
    unitCost: { type: Number, required: true },
    currency: String,
    leadTimeDays: Number,
    effectiveDate: Date,
  },
  { timestamps: true },
);

vendorPriceListSchema.index({ tenantId: 1, vendor: 1, part: 1, effectiveDate: -1 });

export default model<VendorPriceListDocument>('InventoryVendorPrice', vendorPriceListSchema);
