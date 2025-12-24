/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';

export interface FeatureFlagDocument extends Document {
  key: string;
  name?: string;
  description?: string;
  enabled: boolean;
  metadata?: Record<string, unknown>;
  tenantId: Types.ObjectId;
  siteId?: Types.ObjectId | null;
}

const featureFlagSchema = new Schema<FeatureFlagDocument>(
  {
    key: { type: String, required: true },
    name: { type: String },
    description: { type: String },
    enabled: { type: Boolean, default: false },
    metadata: { type: Schema.Types.Mixed },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', index: true, default: null },
  },
  { timestamps: true },
);

featureFlagSchema.index({ tenantId: 1, siteId: 1, key: 1 }, { unique: true });

const FeatureFlag: Model<FeatureFlagDocument> =
  (mongoose.models.FeatureFlag as Model<FeatureFlagDocument>) ||
  mongoose.model<FeatureFlagDocument>('FeatureFlag', featureFlagSchema);

export default FeatureFlag;
