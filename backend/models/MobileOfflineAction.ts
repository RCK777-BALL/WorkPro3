/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, type Model, type Types } from 'mongoose';
import { computeEtag } from '../utils/versioning';

export type MobileOfflineActionStatus = 'pending' | 'processed';

export interface MobileOfflineAction {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  userId: Types.ObjectId;
  type: string;
  payload: Record<string, unknown>;
  status: MobileOfflineActionStatus;
  version?: number;
  etag?: string;
  lastSyncedAt?: Date;
  processedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const MobileOfflineActionSchema = new Schema<MobileOfflineAction>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, required: true, trim: true },
    payload: { type: Schema.Types.Mixed, default: {} },
    status: {
      type: String,
      enum: ['pending', 'processed'],
      default: 'pending',
      index: true,
    },
    version: { type: Number, default: 1, min: 1 },
    etag: { type: String, index: true },
    lastSyncedAt: { type: Date },
    processedAt: { type: Date },
  },
  { timestamps: true },
);

MobileOfflineActionSchema.index({ tenantId: 1, userId: 1, createdAt: -1 });
MobileOfflineActionSchema.index({ tenantId: 1, status: 1 });
MobileOfflineActionSchema.index({ tenantId: 1, etag: 1 });

MobileOfflineActionSchema.pre('save', function handleVersioning(next) {
  if (this.isNew) {
    this.version = this.version ?? 1;
  } else if (this.isModified()) {
    this.version = (this.version ?? 0) + 1;
  }

  const updatedAt = this.updatedAt ?? new Date();
  this.etag = computeEtag(this._id, this.version ?? 1, updatedAt);

  if (this.isModified('status')) {
    this.lastSyncedAt = new Date();
  }

  next();
});

const MobileOfflineActionModel: Model<MobileOfflineAction> = mongoose.model<MobileOfflineAction>(
  'MobileOfflineAction',
  MobileOfflineActionSchema,
);

export default MobileOfflineActionModel;
