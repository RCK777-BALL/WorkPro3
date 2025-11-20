/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, type Model, type Types } from 'mongoose';

export type MobileConflictResolution = 'server' | 'client' | 'manual';
export type MobileConflictStatus = 'pending' | 'resolved';

export interface MobileSyncConflict {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  userId?: Types.ObjectId;
  deviceId?: string;
  entityType: string;
  entityId?: Types.ObjectId | string;
  serverVersion?: number;
  clientVersion?: number;
  payload?: Record<string, unknown>;
  status: MobileConflictStatus;
  resolution?: MobileConflictResolution;
  resolvedBy?: Types.ObjectId;
  resolvedAt?: Date;
  resolutionNotes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const MobileSyncConflictSchema = new Schema<MobileSyncConflict>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    deviceId: { type: String, index: true },
    entityType: { type: String, required: true, trim: true },
    entityId: { type: Schema.Types.Mixed, index: true },
    serverVersion: { type: Number },
    clientVersion: { type: Number },
    payload: { type: Schema.Types.Mixed },
    status: { type: String, enum: ['pending', 'resolved'], default: 'pending', index: true },
    resolution: { type: String, enum: ['server', 'client', 'manual'] },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: { type: Date },
    resolutionNotes: { type: String },
  },
  { timestamps: true },
);

MobileSyncConflictSchema.index({ tenantId: 1, entityType: 1, status: 1 });
MobileSyncConflictSchema.index({ tenantId: 1, deviceId: 1, status: 1 });

const MobileSyncConflict: Model<MobileSyncConflict> = mongoose.model<MobileSyncConflict>(
  'MobileSyncConflict',
  MobileSyncConflictSchema,
);

export default MobileSyncConflict;
