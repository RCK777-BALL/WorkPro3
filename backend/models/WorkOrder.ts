/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Document, Types } from 'mongoose';

export interface WorkOrderDocument extends Document {
  title: string;
  assetId?: Types.ObjectId;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'requested' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  approvalStatus: 'not-required' | 'pending' | 'approved' | 'rejected';
  approvalRequestedBy?: Types.ObjectId;
  approvedBy?: Types.ObjectId;
  assignedTo?: Types.ObjectId;
  assignees?: Types.ObjectId[];
  checklists?: { text: string; done: boolean }[];
  partsUsed?: { partId: Types.ObjectId; qty: number; cost: number }[];
  signatures?: { by: Types.ObjectId; ts: Date }[];
  timeSpentMin?: number;
  photos?: string[];
  failureCode?: string;
  pmTask?: Types.ObjectId;
  department?: Types.ObjectId;
  line?: Types.ObjectId;
  station?: Types.ObjectId;
  teamMemberName?: string;
  importance?: 'low' | 'medium' | 'high' | 'severe';
  tenantId: Types.ObjectId;
  dueDate?: Date;
  completedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const workOrderSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    assetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', index: true },
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
      index: true,
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
    checklists: [{ text: String, done: { type: Boolean, default: false } }],
    partsUsed: [
      {
        partId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem' },
        qty: { type: Number, default: 1 },
        cost: { type: Number, default: 0 },

      },
    ],
    signatures: [
      {
        by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        ts: { type: Date, default: Date.now },

      },
    ],
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

    dueDate: { type: Date },
    completedAt: Date,
  },
  { timestamps: true }
);

export default mongoose.model<WorkOrderDocument>('WorkOrder', workOrderSchema);

