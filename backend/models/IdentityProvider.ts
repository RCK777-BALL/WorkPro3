/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';

export type IdentityProviderProtocol = 'oidc' | 'saml';

export interface IdentityProviderDocument extends Document {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  name: string;
  slug: string;
  protocol: IdentityProviderProtocol;
  issuer?: string;
  metadataUrl?: string;
  authorizationUrl?: string;
  tokenUrl?: string;
  redirectUrl?: string;
  acsUrl?: string;
  ssoUrl?: string;
  clientId?: string;
  clientSecret?: string;
  certificates: string[];
  rawMetadata?: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const identityProviderSchema = new Schema<IdentityProviderDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true },
    protocol: { type: String, enum: ['oidc', 'saml'], required: true },
    issuer: { type: String },
    metadataUrl: { type: String },
    authorizationUrl: { type: String },
    tokenUrl: { type: String },
    redirectUrl: { type: String },
    acsUrl: { type: String },
    ssoUrl: { type: String },
    clientId: { type: String },
    clientSecret: { type: String },
    certificates: { type: [String], default: [] },
    rawMetadata: { type: String },
    enabled: { type: Boolean, default: true },
  },
  { timestamps: true },
);

identityProviderSchema.index({ tenantId: 1, slug: 1 }, { unique: true });

const IdentityProvider: Model<IdentityProviderDocument> =
  mongoose.models.IdentityProvider ||
  mongoose.model<IdentityProviderDocument>('IdentityProvider', identityProviderSchema);

export default IdentityProvider;
