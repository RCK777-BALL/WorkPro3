/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';

export type IdentityProtocol = 'oidc' | 'saml';

export interface IdentityProviderCertificate {
  kid?: string;
  pem: string;
}

export interface IdentityProviderConfigDocument extends Document {
  tenantId: Types.ObjectId;
  protocol: IdentityProtocol;
  provider: string;
  displayName?: string;
  issuer?: string;
  clientId?: string;
  clientSecret?: string;
  metadataUrl?: string;
  metadataXml?: string;
  redirectUri?: string;
  acsUrl?: string;
  enabled: boolean;
  certificates: IdentityProviderCertificate[];
}

const certificateSchema = new Schema<IdentityProviderCertificate>(
  {
    kid: { type: String, trim: true },
    pem: { type: String, required: true },
  },
  { _id: false },
);

const identityProviderConfigSchema = new Schema<IdentityProviderConfigDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    protocol: { type: String, enum: ['oidc', 'saml'], required: true },
    provider: { type: String, required: true, trim: true },
    displayName: { type: String, trim: true },
    issuer: { type: String, trim: true },
    clientId: { type: String, trim: true },
    clientSecret: { type: String, trim: true, select: false },
    metadataUrl: { type: String, trim: true },
    metadataXml: { type: String },
    redirectUri: { type: String, trim: true },
    acsUrl: { type: String, trim: true },
    enabled: { type: Boolean, default: true },
    certificates: { type: [certificateSchema], default: [] },
  },
  { timestamps: true },
);

identityProviderConfigSchema.index({ tenantId: 1, protocol: 1, provider: 1 }, { unique: true });

const IdentityProviderConfig: Model<IdentityProviderConfigDocument> =
  mongoose.models.IdentityProviderConfig ||
  mongoose.model<IdentityProviderConfigDocument>('IdentityProviderConfig', identityProviderConfigSchema);

export default IdentityProviderConfig;
