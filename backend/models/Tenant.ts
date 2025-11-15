/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';

export interface TenantSSOConfig {
  provider?: 'okta' | 'azure';
  issuer?: string;
  clientId?: string;
}

export interface TenantDocument extends Document {
  _id: Types.ObjectId;
  name: string;
  slug?: string;
  status?: 'active' | 'suspended';
  maxSites?: number;
  sso?: TenantSSOConfig;
}

const tenantSchema = new Schema<TenantDocument>(
  {
    name: { type: String, required: true },
    slug: { type: String, lowercase: true, trim: true, unique: true, sparse: true },
    status: { type: String, enum: ['active', 'suspended'], default: 'active' },
    maxSites: { type: Number, min: 1 },
    sso: {
      provider: { type: String, enum: ['okta', 'azure'], required: false },
      issuer: { type: String, required: false },
      clientId: { type: String, required: false },
    },
  },
  { timestamps: true },
);

tenantSchema.index({ slug: 1 }, { unique: true, sparse: true });

const Tenant: Model<TenantDocument> = mongoose.model<TenantDocument>('Tenant', tenantSchema);

export default Tenant;
