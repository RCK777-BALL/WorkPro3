/*
 * SPDX-License-Identifier: MIT
 */

import { Schema, Types, model, type Document } from 'mongoose';

import { validateVendorFields } from '../validators/purchaseOrder';

export interface VendorContact {
  name?: string;
  email?: string;
  phone?: string;
}

export interface VendorAddress {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface VendorDocument extends Document {
  tenantId: Types.ObjectId;
  siteId?: Types.ObjectId | null;
  name: string;
  accountNumber?: string;
  contact?: VendorContact;
  address?: VendorAddress;
  paymentTerms?: string;
  currency?: string;
  leadTimeDays?: number;
  notes?: string;
  active: boolean;
  deletedAt?: Date | null;
  deletedBy?: Types.ObjectId | null;
  created_at?: Date;
  updated_at?: Date;
}

const contactSchema = new Schema<VendorContact>(
  {
    name: { type: String, trim: true },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      validate: {
        validator: (value: string) => !value || /.+@.+\..+/.test(value),
        message: 'Invalid email format',
      },
    },
    phone: { type: String, trim: true },
  },
  { _id: false },
);

const addressSchema = new Schema<VendorAddress>(
  {
    line1: { type: String, trim: true },
    line2: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    postalCode: { type: String, trim: true },
    country: { type: String, trim: true },
  },
  { _id: false },
);

const vendorSchema = new Schema<VendorDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', index: true },
    name: { type: String, required: true, trim: true },
    accountNumber: { type: String, trim: true },
    contact: contactSchema,
    address: addressSchema,
    paymentTerms: { type: String, trim: true },
    currency: { type: String, trim: true },
    leadTimeDays: { type: Number, default: 0, min: 0 },
    notes: { type: String },
    active: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null, index: true },
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

vendorSchema.pre('validate', function preValidate() {
  validateVendorFields(this.name, this.contact?.email);
});

vendorSchema.index({ tenantId: 1, name: 1 });
vendorSchema.index({ tenantId: 1, active: 1 });
vendorSchema.index({ tenantId: 1, name: 'text', notes: 'text' });

export default model<VendorDocument>('VendorV2', vendorSchema);
