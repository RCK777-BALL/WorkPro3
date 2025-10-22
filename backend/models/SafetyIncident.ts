/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export type SafetyIncidentSeverity = 'minor' | 'moderate' | 'major' | 'critical';
export type SafetyIncidentStatus = 'open' | 'investigating' | 'resolved' | 'closed';

export interface SafetyIncidentAction {
  description: string;
  assignedTo?: Types.ObjectId;
  dueDate?: Date;
  completedAt?: Date;
}

export interface SafetyIncidentLogEntry {
  at: Date;
  by?: Types.ObjectId;
  message: string;
}

export interface SafetyIncidentDocument extends Document {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  permit?: Types.ObjectId;
  workOrder?: Types.ObjectId;
  title: string;
  description?: string;
  severity: SafetyIncidentSeverity;
  status: SafetyIncidentStatus;
  reportedBy: Types.ObjectId;
  reportedAt: Date;
  actions: SafetyIncidentAction[];
  timeline: SafetyIncidentLogEntry[];
  createdAt?: Date;
  updatedAt?: Date;
}

const actionSchema = new Schema<SafetyIncidentAction>(
  {
    description: { type: String, required: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    dueDate: { type: Date },
    completedAt: { type: Date },
  },
  { _id: false }
);

const logSchema = new Schema<SafetyIncidentLogEntry>(
  {
    at: { type: Date, default: Date.now },
    by: { type: Schema.Types.ObjectId, ref: 'User' },
    message: { type: String, required: true },
  },
  { _id: false }
);

const safetyIncidentSchema = new Schema<SafetyIncidentDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    permit: { type: Schema.Types.ObjectId, ref: 'Permit' },
    workOrder: { type: Schema.Types.ObjectId, ref: 'WorkOrder' },
    title: { type: String, required: true },
    description: { type: String },
    severity: {
      type: String,
      enum: ['minor', 'moderate', 'major', 'critical'],
      default: 'minor',
    },
    status: {
      type: String,
      enum: ['open', 'investigating', 'resolved', 'closed'],
      default: 'open',
      index: true,
    },
    reportedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reportedAt: { type: Date, default: Date.now },
    actions: { type: [actionSchema], default: [] },
    timeline: { type: [logSchema], default: [] },
  },
  { timestamps: true }
);

safetyIncidentSchema.index({ tenantId: 1, permit: 1 });
safetyIncidentSchema.index({ tenantId: 1, workOrder: 1 });

const SafetyIncident: Model<SafetyIncidentDocument> = mongoose.model<SafetyIncidentDocument>(
  'SafetyIncident',
  safetyIncidentSchema,
);

export default SafetyIncident;
