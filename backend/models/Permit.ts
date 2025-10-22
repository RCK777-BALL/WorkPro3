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

export interface IsolationStep {
  description: string;
  completed: boolean;
  completedAt?: Date;
}

export interface PermitDocument extends Document {
  permitNumber: string;
  tenantId: Types.ObjectId;
  workOrder?: Types.ObjectId;
  type: string;
  status: string;
  validFrom?: Date;
  validTo?: Date;
  riskLevel?: string;
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

const permitSchema = new Schema<PermitDocument>(
  {
    permitNumber: { type: String, required: true, index: true },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    workOrder: { type: Schema.Types.ObjectId, ref: 'WorkOrder' },
    type: { type: String, required: true },
    status: {
      type: String,
      enum: ['draft', 'pending', 'approved', 'active', 'closed', 'cancelled', 'escalated'],
      default: 'pending',
      index: true,
    },
    riskLevel: { type: String },
    validFrom: Date,
    validTo: Date,
    isolationSteps: { type: [isolationStepSchema], default: [] },
    history: { type: [permitHistorySchema], default: [] },
  },
  { timestamps: true },
);

permitSchema.index({ tenantId: 1, status: 1 });
permitSchema.index({ tenantId: 1, type: 1 });

const Permit: Model<PermitDocument> = model<PermitDocument>('Permit', permitSchema);

export default Permit;
