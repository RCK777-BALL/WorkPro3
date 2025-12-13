/*
 * SPDX-License-Identifier: MIT
 */

import { Schema, model, type Document, type Model, type Types } from 'mongoose';

export interface PermitHistoryEntry {
  action: string;
  by?: Types.ObjectId;
  at: Date;
  notes?: string;
}

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

export interface IsolationStep {
  description: string;
  completed: boolean;
  completedAt?: Date;
  verificationNotes?: string;
}

export interface PermitDocument extends Document {
  permitNumber: string;
  tenantId: Types.ObjectId;
  siteId?: Types.ObjectId;
  workOrder?: Types.ObjectId;
  type: string;
  description?: string;
  status:
    | 'draft'
    | 'pending'
    | 'approved'
    | 'active'
    | 'closed'
    | 'cancelled'
    | 'escalated';
  requestedBy?: Types.ObjectId;
  validFrom?: Date;
  validTo?: Date;
  riskLevel?: string;
  approvalChain: PermitApprovalStep[];
  watchers: Types.Array<Types.ObjectId>;
  isolationSteps: IsolationStep[];
  history: PermitHistoryEntry[];
  createdAt: Date;
  updatedAt: Date;
}

const isolationStepSchema = new Schema<IsolationStep>({
  description: { type: String, required: true },
  completed: { type: Boolean, default: false },
  completedAt: { type: Date },
});

const permitHistorySchema = new Schema<PermitHistoryEntry>({
  action: { type: String, required: true },
  by: { type: Schema.Types.ObjectId, ref: 'User' },
  at: { type: Date, default: Date.now },
  notes: String,
});

const permitApprovalSchema = new Schema<PermitApprovalStep>({
  sequence: { type: Number, required: true },
  role: { type: String, required: true },
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  status: {
    type: String,
    enum: ['blocked', 'pending', 'approved', 'rejected', 'escalated'],
    default: 'pending',
  },
  approvedAt: { type: Date },
  actedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  notes: { type: String },
  escalateAfterHours: { type: Number },
  escalateAt: { type: Date },
});

const permitSchema = new Schema<PermitDocument>(
  {
    permitNumber: { type: String, required: true, index: true },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', index: true },
    workOrder: { type: Schema.Types.ObjectId, ref: 'WorkOrder' },
    type: { type: String, required: true },
    description: { type: String },
    status: {
      type: String,
      enum: ['draft', 'pending', 'approved', 'active', 'closed', 'cancelled', 'escalated'],
      default: 'pending',
      index: true,
    },
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    riskLevel: { type: String },
    validFrom: Date,
    validTo: Date,
    approvalChain: { type: [permitApprovalSchema], default: [] },
    watchers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    isolationSteps: { type: [isolationStepSchema], default: [] },
    history: { type: [permitHistorySchema], default: [] },
  },
  { timestamps: true },
);

permitSchema.index({ tenantId: 1, status: 1 });
permitSchema.index({ tenantId: 1, type: 1 });

const Permit: Model<PermitDocument> = model<PermitDocument>('Permit', permitSchema);

export default Permit;
