/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface WorkHistoryMetricsDocument {
  safety: {
    incidentRate: number;
    safetyCompliance: number;
    nearMisses: number;
    lastIncidentDate: string;
    safetyMeetingsAttended: number;
  };
  people: {
    trainingHours: number;
    certifications: string[];
    teamCollaboration: number;
    attendanceRate: number;
    mentorshipHours: number;
  };
  productivity: {
    completedTasks: number;
    onTimeCompletion: number;
    averageResponseTime: string;
    overtimeHours: number;
    taskEfficiencyRate: number;
  };
  improvement: {
    suggestionsSubmitted: number;
    suggestionsImplemented: number;
    processImprovements: number;
    costSavings: number;
  };
}

export interface WorkHistoryEntryDocument {
  id: string;
  date: string;
  type: string;
  title: string;
  status: 'completed' | 'delayed' | 'in_progress';
  duration: number;
  notes?: string;
  category?: 'safety' | 'people' | 'productivity' | 'improvement';
}

export interface WorkHistoryDocument extends Document {
  tenantId: Types.ObjectId;
  memberId: string;
  metrics?: WorkHistoryMetricsDocument;
  recentWork: WorkHistoryEntryDocument[];
  workOrder?: Types.ObjectId;
  asset?: Types.ObjectId;
  performedBy?: Types.ObjectId;
  actions?: string;
  materialsUsed?: Types.Array<Types.ObjectId>;
  timeSpentHours?: number;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const workHistoryMetricsSchema = new Schema<WorkHistoryMetricsDocument>(
  {
    safety: {
      incidentRate: { type: Number, default: 0 },
      safetyCompliance: { type: Number, default: 0 },
      nearMisses: { type: Number, default: 0 },
      lastIncidentDate: { type: String, default: '' },
      safetyMeetingsAttended: { type: Number, default: 0 },
    },
    people: {
      trainingHours: { type: Number, default: 0 },
      certifications: { type: [String], default: [] },
      teamCollaboration: { type: Number, default: 0 },
      attendanceRate: { type: Number, default: 0 },
      mentorshipHours: { type: Number, default: 0 },
    },
    productivity: {
      completedTasks: { type: Number, default: 0 },
      onTimeCompletion: { type: Number, default: 0 },
      averageResponseTime: { type: String, default: '' },
      overtimeHours: { type: Number, default: 0 },
      taskEfficiencyRate: { type: Number, default: 0 },
    },
    improvement: {
      suggestionsSubmitted: { type: Number, default: 0 },
      suggestionsImplemented: { type: Number, default: 0 },
      processImprovements: { type: Number, default: 0 },
      costSavings: { type: Number, default: 0 },
    },
  },
  { _id: false },
);

const workHistoryEntrySchema = new Schema<WorkHistoryEntryDocument>(
  {
    id: { type: String, required: true },
    date: { type: String, required: true },
    type: { type: String, required: true },
    title: { type: String, required: true },
    status: {
      type: String,
      enum: ['completed', 'delayed', 'in_progress'],
      required: true,
    },
    duration: { type: Number, required: true },
    notes: { type: String },
    category: {
      type: String,
      enum: ['safety', 'people', 'productivity', 'improvement'],
    },
  },
  { _id: false },
);

const workHistorySchema = new Schema<WorkHistoryDocument>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    memberId: { type: String, required: true, index: true },
    metrics: { type: workHistoryMetricsSchema, required: false },
    recentWork: { type: [workHistoryEntrySchema], default: [] },
    workOrder: { type: Schema.Types.ObjectId, ref: 'WorkOrder' },
    asset: { type: Schema.Types.ObjectId, ref: 'Asset' },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    actions: String,
    materialsUsed: [{ type: Schema.Types.ObjectId, ref: 'InventoryItem' }],
    timeSpentHours: Number,
    completedAt: Date,
  },
  { timestamps: true },
);

workHistorySchema.index({ tenantId: 1, memberId: 1 }, { unique: true });

export default mongoose.model<WorkHistoryDocument>('WorkHistory', workHistorySchema);
