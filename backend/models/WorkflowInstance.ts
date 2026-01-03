/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, type Document, type Model, Types } from 'mongoose';

export type WorkflowInstanceStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface WorkflowInstanceDocument extends Document {
  tenantId: Types.ObjectId;
  definitionId: Types.ObjectId;
  status: WorkflowInstanceStatus;
  context?: Record<string, unknown>;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const workflowInstanceSchema = new Schema<WorkflowInstanceDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    definitionId: { type: Schema.Types.ObjectId, ref: 'WorkflowDefinition', required: true, index: true },
    status: { type: String, required: true, default: 'pending' },
    context: { type: Schema.Types.Mixed },
    startedAt: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true },
);

workflowInstanceSchema.index({ tenantId: 1, status: 1, createdAt: -1 });

const WorkflowInstance: Model<WorkflowInstanceDocument> = mongoose.model<WorkflowInstanceDocument>(
  'WorkflowInstance',
  workflowInstanceSchema,
);

export default WorkflowInstance;
