/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, Model, Types, HydratedDocument, SchemaDefinitionProperty } from 'mongoose';


export interface WorkOrder {
  _id: Types.ObjectId;
  title: string;
  assetId?: Types.ObjectId;
  description?: string;
  copilotSummary?: string;
  copilotSummaryUpdatedAt?: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'requested' | 'assigned' | 'in_progress' | 'paused' | 'completed' | 'cancelled';
  type: 'corrective' | 'preventive' | 'inspection' | 'calibration' | 'safety';
  approvalStatus: 'not-required' | 'pending' | 'approved' | 'rejected';
  approvalRequestedBy?: Types.ObjectId;
  approvedBy?: Types.ObjectId;
  assignedTo?: Types.ObjectId;
  assignees: Types.Array<Types.ObjectId>;
  checklists: Types.Array<{ text: string; done: boolean }>;
  partsUsed: Types.Array<{ partId: Types.ObjectId; qty: number; cost: number }>;
  signatures: Types.Array<{ by: Types.ObjectId; ts: Date }>;
  permits: Types.Array<Types.ObjectId>;
  requiredPermitTypes: Types.Array<string>;
  timeSpentMin?: number;
  photos: Types.Array<string>;
  failureCode?: string;
  failureModeTags?: Types.Array<string>;

  /** Optional relationships */
  pmTask?: Types.ObjectId;
  department?: Types.ObjectId;
  line?: Types.ObjectId;
  station?: Types.ObjectId;

  teamMemberName?: string;
  importance?: 'low' | 'medium' | 'high' | 'severe';
  complianceProcedureId?: string;
  calibrationIntervalDays?: number;
  tenantId: Types.ObjectId;
  plant?: Types.ObjectId;
  siteId?: Types.ObjectId;

  dueDate?: Date;
  completedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  downtime?: number;
  wrenchTime?: number;
}

export type WorkOrderDocument = HydratedDocument<WorkOrder>;

const tenantRef = {
  type: Schema.Types.ObjectId,
  ref: 'Tenant',
  required: true,
  index: true,
} as SchemaDefinitionProperty<Types.ObjectId>;

const workOrderSchema = new Schema<WorkOrder>(
  {
    title: { type: String, required: true },
    assetId: { type: Schema.Types.ObjectId, ref: 'Asset', index: true },
    description: String,
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['requested', 'assigned', 'in_progress', 'paused', 'completed', 'cancelled'],
      default: 'requested',
      index: true,
    },
    type: {
      type: String,
      enum: ['corrective', 'preventive', 'inspection', 'calibration', 'safety'],
      default: 'corrective',
      index: true,
    },
    approvalStatus: {
      type: String,
      enum: ['not-required', 'pending', 'approved', 'rejected'],
      default: 'not-required',
    },
    approvalRequestedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    assignees: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    checklists: [{ text: String, done: { type: Boolean, default: false } }],
    partsUsed: [
      {
        partId: { type: Schema.Types.ObjectId, ref: 'InventoryItem' },
        qty: { type: Number, default: 1 },
        cost: { type: Number, default: 0 },

      },
    ],
    signatures: [
      {
        by: { type: Schema.Types.ObjectId, ref: 'User' },
        ts: { type: Date, default: Date.now },

      },
    ],
    permits: [{ type: Schema.Types.ObjectId, ref: 'Permit' }],
    requiredPermitTypes: [{ type: String }],
    timeSpentMin: Number,
    photos: [String],
    failureCode: String,
    failureModeTags: [{ type: String }],
    copilotSummary: { type: String },
    copilotSummaryUpdatedAt: { type: Date },

    /** Optional relationships */
    pmTask: { type: Schema.Types.ObjectId, ref: 'PMTask' },
    department: { type: Schema.Types.ObjectId, ref: 'Department' },
    line: { type: Schema.Types.ObjectId, ref: 'Line' },
    station: { type: Schema.Types.ObjectId, ref: 'Station' },

    teamMemberName: String,
    importance: {
      type: String,
      enum: ['low', 'medium', 'high', 'severe'],
    },
    complianceProcedureId: String,
    calibrationIntervalDays: Number,

    tenantId: tenantRef,
    plant: { type: Schema.Types.ObjectId, ref: 'Plant', index: true },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', index: true },
    downtime: { type: Number },
    wrenchTime: { type: Number },

    dueDate: { type: Date },
    completedAt: Date,
  },
  { timestamps: true }
);

const WorkOrder: Model<WorkOrder> = mongoose.model<WorkOrder>('WorkOrder', workOrderSchema);

export default WorkOrder;


