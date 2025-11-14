/*
 * SPDX-License-Identifier: MIT
 */

import { Schema, Types, model, type Document } from 'mongoose';

export interface VendorContact {
  name?: string;
  email?: string;
  phone?: string;
}

export interface VendorDocument extends Document {
  tenantId: Types.ObjectId;
  name: string;
  contact?: VendorContact;
  address?: string;
  leadTimeDays?: number;
  notes?: string;
  preferredSkus: string[];
  partsSupplied: Types.ObjectId[];
}

const vendorSchema = new Schema<VendorDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true, trim: true },
    contact: {
      name: String,
      email: String,
      phone: String,
    },
    address: String,
    leadTimeDays: { type: Number, default: 0 },
    notes: String,
    preferredSkus: { type: [String], default: [] },
    partsSupplied: [{ type: Schema.Types.ObjectId, ref: 'InventoryPart' }],
  },
  { timestamps: true },
);

vendorSchema.index({ tenantId: 1, name: 1 }, { unique: false });

export default model<VendorDocument>('InventoryVendor', vendorSchema);
