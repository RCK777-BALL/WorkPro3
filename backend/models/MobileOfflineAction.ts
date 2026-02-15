/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, type Model, type Types } from 'mongoose';
import { computeEtag } from '../utils/versioning';

export type MobileOfflineActionStatus =
  | 'pending'
  | 'in-progress'
  | 'retrying'
  | 'synced'
  | 'failed';

export interface MobileOfflineAction {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  userId: Types.ObjectId;
  entityType: string;
  entityId?: Types.ObjectId;
  operation: 'create' | 'update' | 'delete' | string;
  type?: string;
  payload: Record<string, unknown>;
  status: MobileOfflineActionStatus;
  version?: number;
  etag?: string;
  lastSyncedAt?: Date;
  attempts?: number;
  maxAttempts?: number;
  nextAttemptAt?: Date;
  backoffSeconds?: number;
  lastError?: string;
  processedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const MobileOfflineActionSchema = new Schema<MobileOfflineAction>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    entityType: { type: String, required: true, trim: true, index: true },
    entityId: { type: Schema.Types.ObjectId },
    operation: { type: String, required: true, trim: true, index: true },
    // deprecated alias retained for backward compatibility
    type: { type: String, trim: true },
    payload: { type: Schema.Types.Mixed, default: {} },
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'retrying', 'synced', 'failed'],
      default: 'pending',
      index: true,
    },
    version: { type: Number, default: 1, min: 1 },
    etag: { type: String, index: true },
    attempts: { type: Number, default: 0, min: 0 },
    maxAttempts: { type: Number, default: 5, min: 1 },
    nextAttemptAt: { type: Date, index: true },
    backoffSeconds: { type: Number, min: 0 },
    lastError: { type: String },
    lastSyncedAt: { type: Date },
    processedAt: { type: Date },
  },
  { timestamps: true },
);

MobileOfflineActionSchema.index({ tenantId: 1, userId: 1, createdAt: -1 });
MobileOfflineActionSchema.index({ tenantId: 1, status: 1 });
MobileOfflineActionSchema.index({ tenantId: 1, etag: 1 });
MobileOfflineActionSchema.index({ tenantId: 1, status: 1, nextAttemptAt: 1 });

MobileOfflineActionSchema.pre('save', function handleVersioning() {
  if (this.isNew) {
    this.version = this.version ?? 1;
    this.nextAttemptAt = this.nextAttemptAt ?? new Date();
  } else if (this.isModified()) {
    this.version = (this.version ?? 0) + 1;
  }

  const updatedAt = this.updatedAt ?? new Date();
  this.etag = computeEtag(this._id, this.version ?? 1, updatedAt);

  if (this.isModified('status') || this.isModified('attempts') || this.isModified('backoffSeconds')) {
    this.lastSyncedAt = new Date();
  }

});

const MobileOfflineActionModel: Model<MobileOfflineAction> = mongoose.model<MobileOfflineAction>(
  'MobileOfflineAction',
  MobileOfflineActionSchema,
);

export default MobileOfflineActionModel;
