/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ApiKeyDocument extends Document {
  tenantId: Types.ObjectId;
  label: string;
  keyHash: string;
  scopes: string[];
  createdBy?: Types.ObjectId;
  createdByName?: string;
  lastFour: string;
  status: 'active' | 'revoked';
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
}

const apiKeySchema = new Schema<ApiKeyDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    label: { type: String, required: true },
    keyHash: { type: String, required: true },
    scopes: { type: [String], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    createdByName: { type: String },
    lastFour: { type: String, required: true },
    status: { type: String, default: 'active' },
    expiresAt: { type: Date },
  },
  {
    collection: 'api_keys',
    timestamps: true,
  },
);

apiKeySchema.index({ tenantId: 1, label: 1 }, { unique: false });

const ApiKey = mongoose.model<ApiKeyDocument>('ApiKey', apiKeySchema);

export default ApiKey;

