/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export type PermitStatus =
  | 'draft'
  | 'pending'
  | 'approved'
  | 'active'
  | 'rejected'
  | 'closed'
  | 'escalated';

export interface PermitApprovalStep {
  sequence: number;
  role: string;
  user?: Types.ObjectId;
  status: 'blocked' | 'pending' | 'approved' | 'rejected' | 'escalated';
  approvedAt?: Date;
  actedBy?: Types.ObjectId;
  notes?: string;
  escalateAfterHours?: number;
  escalateAt?: Date | null;
}

export interface PermitIsolationStep {
  index: number;
  description: string;
  completed?: boolean;
  completedAt?: Date;
  completedBy?: Types.ObjectId;
  verificationNotes?: string;
}

export interface PermitHistoryEntry {
  action: string;
  by?: Types.ObjectId;
  at: Date;
  notes?: string;
}

export interface PermitDocument extends Document {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  permitNumber: string;
  type: string;
  description?: string;
  status: PermitStatus;
  requestedBy: Types.ObjectId;
  workOrder?: Types.ObjectId;
  approvalChain: PermitApprovalStep[];
  isolationSteps: PermitIsolationStep[];
  watchers: Types.ObjectId[];
  history: PermitHistoryEntry[];
  validFrom?: Date;
  validTo?: Date;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  incidents: Types.ObjectId[];
  createdAt?: Date;
  updatedAt?: Date;
}

const approvalStepSchema = new Schema<PermitApprovalStep>(
  {
    sequence: { type: Number, required: true },
    role: { type: String, required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    status: {
      type: String,
      enum: ['blocked', 'pending', 'approved', 'rejected', 'escalated'],
      default: 'blocked',
    },
    approvedAt: { type: Date },
    actedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String },
    escalateAfterHours: { type: Number },
    escalateAt: { type: Date },
  },
  { _id: false }
);

const isolationStepSchema = new Schema<PermitIsolationStep>(
  {
    index: { type: Number, required: true },
    description: { type: String, required: true },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date },
    completedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    verificationNotes: { type: String },
  },
  { _id: false }
);

const historySchema = new Schema<PermitHistoryEntry>(
  {
    action: { type: String, required: true },
    by: { type: Schema.Types.ObjectId, ref: 'User' },
    at: { type: Date, default: Date.now },
    notes: { type: String },
  },
  { _id: false }
);

const permitSchema = new Schema<PermitDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    permitNumber: { type: String, required: true, unique: true },
    type: { type: String, required: true },
    description: { type: String },
    status: {
      type: String,
      enum: ['draft', 'pending', 'approved', 'active', 'rejected', 'closed', 'escalated'],
      default: 'pending',
      index: true,
    },
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    workOrder: { type: Schema.Types.ObjectId, ref: 'WorkOrder' },
    approvalChain: { type: [approvalStepSchema], default: [] },
    isolationSteps: { type: [isolationStepSchema], default: [] },
    watchers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    history: { type: [historySchema], default: [] },
    validFrom: { type: Date },
    validTo: { type: Date },
    riskLevel: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
    incidents: [{ type: Schema.Types.ObjectId, ref: 'SafetyIncident' }],
  },
  { timestamps: true }
);

permitSchema.index({ tenantId: 1, permitNumber: 1 }, { unique: true });
permitSchema.index({ tenantId: 1, status: 1 });
permitSchema.index({ tenantId: 1, workOrder: 1 });

const Permit: Model<PermitDocument> = mongoose.model<PermitDocument>('Permit', permitSchema);

export default Permit;
