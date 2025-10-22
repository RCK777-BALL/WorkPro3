/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';

export interface PermitHistoryEntry {
  action: string;
  by?: Types.ObjectId;
  at: Date;
  notes?: string;
}

export interface IsolationStep {
  name?: string;
  completed: boolean;
}

export interface PermitDocument extends Document {
  tenantId: Types.ObjectId;
  status: string;
  type?: string;
  permitNumber?: string;
  workOrder?: Types.ObjectId;
  requiredFor?: string[];
  isolationSteps?: IsolationStep[];
  history: PermitHistoryEntry[];
}

const permitSchema = new Schema<PermitDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    status: { type: String, default: 'pending' },
    type: { type: String },
    permitNumber: { type: String },
    workOrder: { type: Schema.Types.ObjectId, ref: 'WorkOrder' },
    requiredFor: [{ type: String }],
    isolationSteps: [
      {
        name: { type: String },
        completed: { type: Boolean, default: false },
      },
    ],
    history: [
      {
        action: { type: String, required: true },
        by: { type: Schema.Types.ObjectId, ref: 'User' },
        at: { type: Date, default: Date.now },
        notes: { type: String },
      },
    ],
  },
  { timestamps: true },
);

permitSchema.pre('save', function ensureHistory(this: PermitDocument, next) {
  if (!Array.isArray(this.history)) {
    this.history = [];
  }
  next();
});

const Permit: Model<PermitDocument> = mongoose.model<PermitDocument>('Permit', permitSchema);

export default Permit;
