/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, type Model, type Types } from 'mongoose';

export interface MobileDeviceTelemetry {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  userId?: Types.ObjectId;
  deviceId: string;
  platform?: string;
  appVersion?: string;
  lastSeenAt?: Date;
  lastSyncAt?: Date;
  pendingActions?: number;
  failedActions?: number;
  totalConflicts?: number;
  lastFailureReason?: string;
  meta?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}

const MobileDeviceTelemetrySchema = new Schema<MobileDeviceTelemetry>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    deviceId: { type: String, required: true, index: true },
    platform: { type: String },
    appVersion: { type: String },
    lastSeenAt: { type: Date, index: true },
    lastSyncAt: { type: Date },
    pendingActions: { type: Number, default: 0, min: 0 },
    failedActions: { type: Number, default: 0, min: 0 },
    totalConflicts: { type: Number, default: 0, min: 0 },
    lastFailureReason: { type: String },
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

MobileDeviceTelemetrySchema.index({ tenantId: 1, deviceId: 1 }, { unique: true });

const MobileDeviceTelemetry: Model<MobileDeviceTelemetry> = mongoose.model<MobileDeviceTelemetry>(
  'MobileDeviceTelemetry',
  MobileDeviceTelemetrySchema,
);

export default MobileDeviceTelemetry;
