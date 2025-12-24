/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';

export interface WorkOrderChecklistLogDocument extends Document {
  tenantId: Types.ObjectId;
  workOrderId: Types.ObjectId;
  checklistItemId: string;
  checklistItemLabel?: string;
  reading?: string | number | boolean | null;
  passed?: boolean;
  evidenceUrls?: string[];
  evidenceFileIds?: Types.ObjectId[];
  recordedAt: Date;
  recordedBy?: Types.ObjectId;
}

const workOrderChecklistLogSchema = new Schema<WorkOrderChecklistLogDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    workOrderId: { type: Schema.Types.ObjectId, ref: 'WorkOrder', required: true, index: true },
    checklistItemId: { type: String, required: true },
    checklistItemLabel: { type: String },
    reading: { type: Schema.Types.Mixed },
    passed: { type: Boolean },
    evidenceUrls: { type: [String], default: [] },
    evidenceFileIds: { type: [Schema.Types.ObjectId], ref: 'EvidenceFile', default: [] },
    recordedAt: { type: Date, default: () => new Date(), index: true },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

workOrderChecklistLogSchema.index({ tenantId: 1, workOrderId: 1, checklistItemId: 1, recordedAt: -1 });

const WorkOrderChecklistLog: Model<WorkOrderChecklistLogDocument> =
  (mongoose.models.WorkOrderChecklistLog as Model<WorkOrderChecklistLogDocument>) ||
  mongoose.model<WorkOrderChecklistLogDocument>('WorkOrderChecklistLog', workOrderChecklistLogSchema);

export default WorkOrderChecklistLog;
