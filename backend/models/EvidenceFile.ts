/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface EvidenceFileDocument extends Document {
  tenantId: Types.ObjectId;
  workOrderId: Types.ObjectId;
  checklistItemId?: string;
  url: string;
  filename?: string;
  contentType?: string;
  uploadedBy?: Types.ObjectId;
  uploadedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const evidenceFileSchema = new Schema<EvidenceFileDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    workOrderId: { type: Schema.Types.ObjectId, ref: 'WorkOrder', required: true, index: true },
    checklistItemId: { type: String, index: true },
    url: { type: String, required: true },
    filename: { type: String },
    contentType: { type: String },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: { type: Date, default: () => new Date(), index: true },
  },
  { timestamps: true, collection: 'evidence_files' },
);

evidenceFileSchema.index({ tenantId: 1, workOrderId: 1, checklistItemId: 1, uploadedAt: -1 });

export default mongoose.model<EvidenceFileDocument>('EvidenceFile', evidenceFileSchema);
