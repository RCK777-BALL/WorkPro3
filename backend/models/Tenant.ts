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
  sso?: TenantSSOConfig;
}

const tenantSchema = new Schema<TenantDocument>(
  {
    name: { type: String, required: true },
    sso: {
      provider: { type: String, enum: ['okta', 'azure'], required: false },
      issuer: { type: String, required: false },
      clientId: { type: String, required: false },
    },
  },
  { timestamps: true },
);

const Tenant: Model<TenantDocument> = mongoose.model<TenantDocument>('Tenant', tenantSchema);

export default Tenant;
