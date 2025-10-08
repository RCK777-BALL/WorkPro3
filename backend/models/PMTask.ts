/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Document, Schema } from 'mongoose';

interface Rule {
  type: 'calendar' | 'meter';
  cron?: string;
  meterName?: string;
  threshold?: number;
}

export interface PMTaskDocument extends Document {
  title: string;
  tenantId: Schema.Types.ObjectId;
  notes?: string;
  asset?: mongoose.Schema.Types.ObjectId;
  department?: string; // optional, for summary use
  rule: Rule;
  lastGeneratedAt?: Date;
  active: boolean;
}

const PmTaskSchema = new Schema<PMTaskDocument>(
  {
    title: { type: String, required: true },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    notes: String,
    asset: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset' },
    department: String,
    rule: {
      type: {
        type: String,
        enum: ['calendar', 'meter'],
        required: true,
      },
      cron: String,
      meterName: String,
      threshold: Number,
    },
    lastGeneratedAt: { type: Date },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model<PMTaskDocument>('PmTask', PmTaskSchema);
