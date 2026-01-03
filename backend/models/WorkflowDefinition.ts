/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, type Document, type Model, Types } from 'mongoose';

export interface WorkflowStep {
  name: string;
  type: string;
  config?: Record<string, unknown>;
}

export interface WorkflowDefinitionDocument extends Document {
  tenantId: Types.ObjectId;
  name: string;
  description?: string;
  steps: WorkflowStep[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const workflowStepSchema = new Schema<WorkflowStep>(
  {
    name: { type: String, required: true },
    type: { type: String, required: true },
    config: { type: Schema.Types.Mixed },
  },
  { _id: false },
);

const workflowDefinitionSchema = new Schema<WorkflowDefinitionDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true },
    description: { type: String },
    steps: { type: [workflowStepSchema], default: [] },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

workflowDefinitionSchema.index({ tenantId: 1, name: 1 }, { unique: true });

const WorkflowDefinition: Model<WorkflowDefinitionDocument> = mongoose.model<WorkflowDefinitionDocument>(
  'WorkflowDefinition',
  workflowDefinitionSchema,
);

export default WorkflowDefinition;
