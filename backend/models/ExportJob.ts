/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export type ExportJobStatus = 'queued' | 'processing' | 'completed' | 'failed';
export type ExportJobFormat = 'csv' | 'xlsx';

export interface ExportJobDocument extends Document {
  tenantId: mongoose.Types.ObjectId;
  requestedBy?: mongoose.Types.ObjectId;
  type: string;
  format: ExportJobFormat;
  status: ExportJobStatus;
  filters?: Record<string, unknown>;
  fileName?: string;
  filePath?: string;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const exportJobSchema = new Schema<ExportJobDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    type: { type: String, required: true },
    format: { type: String, enum: ['csv', 'xlsx'], default: 'csv' },
    status: { type: String, enum: ['queued', 'processing', 'completed', 'failed'], default: 'queued' },
    filters: { type: Schema.Types.Mixed },
    fileName: { type: String },
    filePath: { type: String },
    error: { type: String },
    startedAt: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true },
);

exportJobSchema.index({ tenantId: 1, status: 1, createdAt: -1 });

const ExportJob: Model<ExportJobDocument> = mongoose.model<ExportJobDocument>('ExportJob', exportJobSchema);

export default ExportJob;
