/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';

export type InspectionStatus = 'draft' | 'in-progress' | 'completed' | 'archived';

export interface ChecklistResponse {
  itemId: string;
  response: string | number | boolean | string[] | null;
  passed?: boolean;
  notes?: string;
}

export interface InspectionRecordDocument extends Document {
  tenantId: Types.ObjectId;
  siteId?: Types.ObjectId | null;
  assetId?: Types.ObjectId | null;
  templateId: Types.ObjectId;
  templateName: string;
  status: InspectionStatus;
  sections: unknown[];
  responses: ChecklistResponse[];
  summary?: string | null;
  completedBy?: Types.ObjectId | null;
  startedAt: Date;
  completedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const checklistResponseSchema = new Schema<ChecklistResponse>(
  {
    itemId: { type: String, required: true },
    response: { type: Schema.Types.Mixed },
    passed: { type: Boolean },
    notes: { type: String },
  },
  { _id: false },
);

const inspectionRecordSchema = new Schema<InspectionRecordDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', index: true },
    assetId: { type: Schema.Types.ObjectId, ref: 'Asset', index: true },
    templateId: { type: Schema.Types.ObjectId, ref: 'InspectionTemplate', required: true },
    templateName: { type: String, required: true },
    status: { type: String, enum: ['draft', 'in-progress', 'completed', 'archived'], default: 'draft' },
    sections: { type: [Schema.Types.Mixed], default: [] },
    responses: { type: [checklistResponseSchema], default: [] },
    summary: { type: String },
    completedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    startedAt: { type: Date, default: () => new Date() },
    completedAt: { type: Date },
  },
  { timestamps: true },
);

inspectionRecordSchema.index({ tenantId: 1, assetId: 1, status: 1 });
inspectionRecordSchema.index({ tenantId: 1, templateId: 1, status: 1 });

const InspectionRecord: Model<InspectionRecordDocument> =
  (mongoose.models.InspectionRecord as Model<InspectionRecordDocument>) ||
  mongoose.model<InspectionRecordDocument>('InspectionRecord', inspectionRecordSchema);

export default InspectionRecord;
