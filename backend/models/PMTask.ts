/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Document, Schema } from 'mongoose';

export interface PmTaskDocument extends Document {
  title: string;
  isActive: boolean;
  tenantId: Schema.Types.ObjectId;
  lastRun?: Date;
  nextDue?: Date;
  frequency:
    | 'daily'
    | 'weekly'
    | 'monthly'
    | 'quarterly'
    | 'biannually'
    | 'annually';
  notes?: string;
  asset?: mongoose.Schema.Types.ObjectId;
  department?: string; // optional, for summary use
}

const PmTaskSchema = new Schema<PmTaskDocument>(
  {
    title: { type: String, required: true },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    isActive: { type: Boolean, default: true },
    lastRun: { type: Date },
    nextDue: { type: Date },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'quarterly', 'biannually', 'annually'],
      required: true,
    },
    notes: String,
    asset: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset' },
    department: String,
  },
  { timestamps: true }
);

export default mongoose.model<PmTaskDocument>('PmTask', PmTaskSchema);
