/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, type Model, type SchemaDefinitionProperty, type Types } from 'mongoose';

export type WorkflowScope = 'work_order' | 'work_request';

export interface WorkflowEscalationRule {
  trigger: 'response' | 'resolve';
  thresholdMinutes?: number;
  escalateTo?: Types.ObjectId[];
  channel?: 'email' | 'sms' | 'push';
  maxRetries?: number;
  retryBackoffMinutes?: number;
  templateKey?: string;
}

export interface WorkflowTemplates {
  emailSubject?: string;
  emailBody?: string;
  smsBody?: string;
}

export interface WorkflowRuleDocument {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  siteId?: Types.ObjectId;
  name: string;
  scope: WorkflowScope;
  approvalSteps: Array<{
    step: number;
    name: string;
    approver?: Types.ObjectId;
    required?: boolean;
  }>;
  slaResponseMinutes?: number;
  slaResolveMinutes?: number;
  escalations?: WorkflowEscalationRule[];
  templates?: WorkflowTemplates;
  isDefault: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const tenantRef = {
  type: Schema.Types.ObjectId,
  ref: 'Tenant',
  required: true,
  index: true,
} as SchemaDefinitionProperty<Types.ObjectId>;

const workflowRuleSchema = new Schema<WorkflowRuleDocument>(
  {
    tenantId: tenantRef,
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', index: true },
    name: { type: String, required: true },
    scope: { type: String, enum: ['work_order', 'work_request'], required: true },
    approvalSteps: {
      type: [
        {
          step: { type: Number, required: true },
          name: { type: String, required: true },
          approver: { type: Schema.Types.ObjectId, ref: 'User' },
          required: { type: Boolean, default: true },
        },
      ],
      default: [],
    },
    slaResponseMinutes: { type: Number },
    slaResolveMinutes: { type: Number },
    escalations: {
      type: [
        {
          trigger: { type: String, enum: ['response', 'resolve'], required: true },
          thresholdMinutes: { type: Number },
          escalateTo: [{ type: Schema.Types.ObjectId, ref: 'User' }],
          channel: { type: String, enum: ['email', 'sms', 'push'], default: 'email' },
          maxRetries: { type: Number, default: 0 },
          retryBackoffMinutes: { type: Number, default: 30 },
          templateKey: { type: String },
        },
      ],
      default: [],
    },
    templates: {
      emailSubject: { type: String },
      emailBody: { type: String },
      smsBody: { type: String },
    },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const WorkflowRule: Model<WorkflowRuleDocument> = mongoose.model<WorkflowRuleDocument>('WorkflowRule', workflowRuleSchema);

export default WorkflowRule;
