/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';

export type IdentityProviderType = 'oidc' | 'saml';

export interface IdentityProviderConfigDocument extends Document {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  name: string;
  type: IdentityProviderType;
  issuer?: string;
  clientId?: string;
  clientSecret?: string;
  metadataUrl?: string;
  metadataXml?: string;
  certificate?: string;
  acsUrl?: string;
  entityId?: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const identityProviderConfigSchema = new Schema<IdentityProviderConfigDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ['oidc', 'saml'], required: true },
    issuer: { type: String },
    clientId: { type: String },
    clientSecret: { type: String },
    metadataUrl: { type: String },
    metadataXml: { type: String },
    certificate: { type: String },
    acsUrl: { type: String },
    entityId: { type: String },
    enabled: { type: Boolean, default: true },
  },
  { timestamps: true },
);

identityProviderConfigSchema.index({ tenantId: 1, name: 1 }, { unique: true });

const IdentityProviderConfig: Model<IdentityProviderConfigDocument> = mongoose.model(
  'IdentityProviderConfig',
  identityProviderConfigSchema,
);

export default IdentityProviderConfig;
