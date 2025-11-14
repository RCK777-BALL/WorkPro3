/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Document, Schema, Types } from 'mongoose';

interface Rule {
  type: 'calendar' | 'meter';
  cron?: string;
  meterName?: string;
  threshold?: number;
}

export interface PMTaskChecklistItem {
  _id?: Types.ObjectId;
  description: string;
  required?: boolean;
}

export interface PMTaskRequiredPart {
  _id?: Types.ObjectId;
  partId: Types.ObjectId;
  quantity?: number;
}

export interface PMTaskAssignmentDocument extends Document {
  _id: Types.ObjectId;
  asset: Types.ObjectId;
  interval: string;
  checklist: Types.DocumentArray<PMTaskChecklistItem>;
  requiredParts: Types.DocumentArray<PMTaskRequiredPart>;
  nextDue?: Date;
  lastGeneratedAt?: Date;
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
  assignments: Types.DocumentArray<PMTaskAssignmentDocument>;
}

const checklistSchema = new Schema<PMTaskChecklistItem>(
  {
    description: { type: String, required: true },
    required: { type: Boolean, default: true },
  },
  { _id: true },
);

const requiredPartSchema = new Schema<PMTaskRequiredPart>(
  {
    partId: { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
    quantity: { type: Number, default: 1 },
  },
  { _id: true },
);

const assignmentSchema = new Schema<PMTaskAssignmentDocument>(
  {
    asset: { type: Schema.Types.ObjectId, ref: 'Asset', required: true },
    interval: { type: String, required: true },
    checklist: { type: [checklistSchema], default: [] },
    requiredParts: { type: [requiredPartSchema], default: [] },
    nextDue: { type: Date },
    lastGeneratedAt: { type: Date },
  },
  { _id: true },
);

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
    assignments: { type: [assignmentSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model<PMTaskDocument>('PmTask', PmTaskSchema);
