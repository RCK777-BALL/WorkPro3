/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, type Model, type SchemaDefinitionProperty, type Types } from 'mongoose';

const tenantRef = {
  type: Schema.Types.ObjectId,
  ref: 'Tenant',
  required: true,
  index: true,
} as SchemaDefinitionProperty<Types.ObjectId>;

export interface SlaEscalationRule {
  trigger: 'response' | 'resolve';
  thresholdMinutes?: number;
  escalateTo?: Types.ObjectId[];
  channel?: 'email' | 'push' | 'sms';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  reassign?: boolean;
  maxRetries?: number;
  retryBackoffMinutes?: number;
  templateKey?: string;
}

export interface SlaPolicyDocument {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  siteId?: Types.ObjectId | null;
  assetCategory?: string | null;
  name: string;
  responseMinutes?: number;
  resolveMinutes?: number;
  escalations?: SlaEscalationRule[];
  createdAt?: Date;
  updatedAt?: Date;
}

const slaPolicySchema = new Schema<SlaPolicyDocument>(
  {
    tenantId: tenantRef,
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', index: true },
    assetCategory: { type: String, index: true },
    name: { type: String, required: true },
    responseMinutes: { type: Number },
    resolveMinutes: { type: Number },
    escalations: {
      type: [
        {
          trigger: { type: String, enum: ['response', 'resolve'], required: true },
          thresholdMinutes: { type: Number },
          escalateTo: [{ type: Schema.Types.ObjectId, ref: 'User' }],
          channel: { type: String, enum: ['email', 'push', 'sms'], default: 'email' },
          priority: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
          reassign: { type: Boolean, default: false },
          maxRetries: { type: Number, default: 0 },
          retryBackoffMinutes: { type: Number, default: 30 },
          templateKey: { type: String },
        },
      ],
      default: [],
    },
  },
  { timestamps: true },
);

slaPolicySchema.index({ tenantId: 1, siteId: 1, assetCategory: 1, updatedAt: -1 });

const SlaPolicy: Model<SlaPolicyDocument> = mongoose.model<SlaPolicyDocument>('SlaPolicy', slaPolicySchema);

export default SlaPolicy;
