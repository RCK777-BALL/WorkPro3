/*
 * SPDX-License-Identifier: MIT
 */

import mongoose from 'mongoose';

const workHistoryEntrySchema = new mongoose.Schema({
  id: { type: String, required: true },
  date: { type: Date, required: true },
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
}, { _id: false });

const workHistoryMetricsSchema = new mongoose.Schema({
  safety: {
    incidentRate: { type: Number, default: 0 },
    lastIncidentDate: { type: String, default: '' },
    safetyCompliance: { type: Number, default: 0 },
    nearMisses: { type: Number, default: 0 },
    safetyMeetingsAttended: { type: Number, default: 0 },
  },
  people: {
    attendanceRate: { type: Number, default: 0 },
    teamCollaboration: { type: Number, default: 0 },
    trainingHours: { type: Number, default: 0 },
    certifications: { type: [String], default: [] },
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
    costSavings: { type: Number, default: 0 },
    suggestionsSubmitted: { type: Number, default: 0 },
    suggestionsImplemented: { type: Number, default: 0 },
    processImprovements: { type: Number, default: 0 },
  },
}, { _id: false });

const workHistorySchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
  workOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkOrder' },
  asset: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset' },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  actions: String,
  materialsUsed: [{ type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem' }],
  timeSpentHours: Number,
  completedAt: Date,
  metrics: {
    type: workHistoryMetricsSchema,
    default: () => ({}),
  },
  recentWork: {
    type: [workHistoryEntrySchema],
    default: [],
  },
}, {
  timestamps: true,
});

export default mongoose.model('WorkHistory', workHistorySchema);
