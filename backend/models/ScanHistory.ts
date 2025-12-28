/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface ScanHistoryResolution {
  type?: string;
  id?: string;
  label?: string;
  path?: string;
}

export interface ScanHistorySession {
  ipHash?: string;
  userAgent?: string;
  deviceId?: string;
}

export interface ScanHistoryDocument extends Document {
  tenantId: Types.ObjectId;
  siteId?: Types.ObjectId;
  userId?: Types.ObjectId;
  session?: ScanHistorySession;
  rawValue: string;
  outcome: 'success' | 'failure';
  source?: string;
  resolution?: ScanHistoryResolution;
  error?: string;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}

const scanHistorySchema = new Schema<ScanHistoryDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    session: {
      ipHash: { type: String },
      userAgent: { type: String },
      deviceId: { type: String },
      _id: false,
    },
    rawValue: { type: String, required: true, trim: true },
    outcome: { type: String, enum: ['success', 'failure'], required: true },
    source: { type: String, trim: true },
    resolution: {
      type: { type: String, trim: true },
      id: { type: String, trim: true },
      label: { type: String, trim: true },
      path: { type: String, trim: true },
      _id: false,
    },
    error: { type: String, trim: true },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

scanHistorySchema.index({ tenantId: 1, createdAt: -1 });
scanHistorySchema.index({ tenantId: 1, userId: 1, createdAt: -1 });

export default mongoose.model<ScanHistoryDocument>('ScanHistory', scanHistorySchema);
