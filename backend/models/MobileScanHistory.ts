/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, type Document, type Types } from 'mongoose';

export type MobileScanOutcome = 'resolved' | 'missing' | 'invalid' | 'error';

export interface MobileScanHistoryDocument extends Document {
  tenantId: Types.ObjectId;
  userId: Types.ObjectId;
  rawValue: string;
  decodedType?: string | null;
  decodedId?: string | null;
  decodedLabel?: string | null;
  navigationTarget?: string | null;
  outcome: MobileScanOutcome;
  errorMessage?: string | null;
  exportState?: 'pending' | 'exported';
  exportedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

const mobileScanHistorySchema = new Schema<MobileScanHistoryDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    rawValue: { type: String, required: true },
    decodedType: { type: String },
    decodedId: { type: String },
    decodedLabel: { type: String },
    navigationTarget: { type: String },
    outcome: { type: String, enum: ['resolved', 'missing', 'invalid', 'error'], required: true },
    errorMessage: { type: String },
    exportState: { type: String, enum: ['pending', 'exported'], default: 'pending', index: true },
    exportedAt: { type: Date },
  },
  { timestamps: true },
);

mobileScanHistorySchema.index({ tenantId: 1, userId: 1, createdAt: -1 });
mobileScanHistorySchema.index({ tenantId: 1, exportState: 1, createdAt: -1 });

export default mongoose.model<MobileScanHistoryDocument>('MobileScanHistory', mobileScanHistorySchema);
