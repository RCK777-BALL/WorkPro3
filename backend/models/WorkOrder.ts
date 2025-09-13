/*
 * SPDX-License-Identifier: MIT
 */

import mongoose from 'mongoose';

const workOrderSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    asset: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset' },
    description: String,
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['requested', 'assigned', 'in_progress', 'completed', 'cancelled'],
      default: 'requested',
    },
    approvalStatus: {
      type: String,
      enum: ['not-required', 'pending', 'approved', 'rejected'],
      default: 'not-required',
    },
    approvalRequestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assignees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    checklists: [String],
    partsUsed: [{ type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem' }],
    timeSpentMin: Number,
    photos: [String],
    failureCode: String,

    /** Optional relationships */
    pmTask: { type: mongoose.Schema.Types.ObjectId, ref: 'PMTask' },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    line: { type: mongoose.Schema.Types.ObjectId, ref: 'Line' },
    station: { type: mongoose.Schema.Types.ObjectId, ref: 'Station' },

    teamMemberName: String,
    importance: {
      type: String,
      enum: ['low', 'medium', 'high', 'severe'],
    },

    tenantId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },

    dateCreated: { type: Date, default: Date.now },
    dueDate: { type: Date },
    completedAt: Date,
  },
  { timestamps: true }
);

export default mongoose.model('WorkOrder', workOrderSchema);
