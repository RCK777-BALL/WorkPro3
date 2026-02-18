/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Types } from 'mongoose';

export interface VendorDocument extends mongoose.Document {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  name: string;
  email?: string;
  phone?: string;
  tags: string[];
  isActive: boolean;
  deletedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

const vendorSchema = new mongoose.Schema<VendorDocument>(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true },
    phone: { type: String, trim: true },
    tags: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

vendorSchema.index({ tenantId: 1, name: 1 });
vendorSchema.index({ tenantId: 1, deletedAt: 1 });

export default mongoose.model<VendorDocument>('Vendor', vendorSchema);
