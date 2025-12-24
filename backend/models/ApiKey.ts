/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ApiKeyDocument extends Document {
  name: string;
  keyHash: string;
  prefix: string;
  tenantId: mongoose.Types.ObjectId;
  createdBy?: mongoose.Types.ObjectId;
  lastUsedAt?: Date;
  revokedAt?: Date;
  rateLimitMax?: number;
  createdAt: Date;
  updatedAt: Date;
}

const apiKeySchema = new Schema<ApiKeyDocument>(
  {
    name: { type: String, required: true },
    keyHash: { type: String, required: true, select: false },
    prefix: { type: String, required: true },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    lastUsedAt: { type: Date },
    revokedAt: { type: Date },
    rateLimitMax: { type: Number },
  },
  { timestamps: true },
);

apiKeySchema.index({ tenantId: 1, name: 1 });
apiKeySchema.index({ keyHash: 1 }, { unique: true });

const ApiKey: Model<ApiKeyDocument> = mongoose.model<ApiKeyDocument>('ApiKey', apiKeySchema);

export default ApiKey;
