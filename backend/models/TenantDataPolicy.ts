/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';

import { getSecurityPolicy } from '../config/securityPolicies';

export interface TenantDataPolicyDocument extends Document {
  tenantId: Types.ObjectId;
  residency: {
    region: string;
  };
  retentionDays: {
    audit: number;
    data: number;
  };
  allowGlobalSearch: boolean;
  allowCrossSiteRollups: boolean;
  updatedBy?: Types.ObjectId | null;
  updatedAt: Date;
}

const defaultAuditRetention = () => getSecurityPolicy().audit.retentionDays;

const tenantDataPolicySchema = new Schema<TenantDataPolicyDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, unique: true, index: true },
    residency: {
      region: { type: String, required: true, default: 'us-central' },
    },
    retentionDays: {
      audit: { type: Number, required: true, default: defaultAuditRetention },
      data: { type: Number, required: true, default: 365 },
    },
    allowGlobalSearch: { type: Boolean, default: false },
    allowCrossSiteRollups: { type: Boolean, default: false },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedAt: { type: Date, required: true, default: () => new Date() },
  },
  {
    timestamps: { createdAt: false, updatedAt: true },
    versionKey: false,
  },
);

tenantDataPolicySchema.index({ residency: 1 });
tenantDataPolicySchema.index({ allowGlobalSearch: 1 });

type TenantDataPolicyModel = Model<TenantDataPolicyDocument>;

const TenantDataPolicy: TenantDataPolicyModel =
  (mongoose.models.TenantDataPolicy as TenantDataPolicyModel) ||
  mongoose.model<TenantDataPolicyDocument>('TenantDataPolicy', tenantDataPolicySchema);

export default TenantDataPolicy;
