/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, type Model, type SchemaDefinitionProperty, type Types } from 'mongoose';

export type SlaRuleScope = 'work_order' | 'work_request';

export interface SlaRuleEscalation {
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

export interface SlaRuleDocument {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  siteId?: Types.ObjectId | null;
  assetCategory?: string | null;
  priority?: 'low' | 'medium' | 'high' | 'critical' | null;
  workType?: 'corrective' | 'preventive' | 'inspection' | 'calibration' | 'safety' | null;
  name: string;
  scope: SlaRuleScope;
  responseMinutes?: number;
  resolveMinutes?: number;
  escalations?: SlaRuleEscalation[];
  isDefault?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const tenantRef = {
  type: Schema.Types.ObjectId,
  ref: 'Tenant',
  required: true,
  index: true,
} as SchemaDefinitionProperty<Types.ObjectId>;

const slaRuleSchema = new Schema<SlaRuleDocument>(
  {
    tenantId: tenantRef,
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', index: true },
    assetCategory: { type: String, index: true },
    priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], index: true },
    workType: {
      type: String,
      enum: ['corrective', 'preventive', 'inspection', 'calibration', 'safety'],
      index: true,
    },
    name: { type: String, required: true },
    scope: { type: String, enum: ['work_order', 'work_request'], required: true },
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
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true },
);

slaRuleSchema.index({ tenantId: 1, siteId: 1, assetCategory: 1, priority: 1, workType: 1, updatedAt: -1 });

const SlaRule: Model<SlaRuleDocument> = mongoose.model<SlaRuleDocument>('SlaRule', slaRuleSchema);

export default SlaRule;
