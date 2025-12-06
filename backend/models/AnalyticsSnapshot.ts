/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, type Types } from 'mongoose';

export type Granularity = 'day' | 'month';

export interface AnalyticsMetricSnapshot {
  tenantId: Types.ObjectId;
  siteId?: Types.ObjectId;
  assetId?: Types.ObjectId;
  technicianId?: Types.ObjectId;
  period: Date;
  granularity: Granularity;
  mtbfHours: number;
  mttrHours: number;
  responseSlaRate: number;
  resolutionSlaRate: number;
  technicianUtilization: number;
  downtimeHours: number;
  maintenanceCost: number;
  siteName?: string;
  assetName?: string;
  technicianName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const analyticsSnapshotSchema = new Schema<AnalyticsMetricSnapshot>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', index: true, required: true },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', index: true },
    assetId: { type: Schema.Types.ObjectId, ref: 'Asset', index: true },
    technicianId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    period: { type: Date, required: true, index: true },
    granularity: { type: String, enum: ['day', 'month'], default: 'month', index: true },
    mtbfHours: { type: Number, default: 0 },
    mttrHours: { type: Number, default: 0 },
    responseSlaRate: { type: Number, default: 0 },
    resolutionSlaRate: { type: Number, default: 0 },
    technicianUtilization: { type: Number, default: 0 },
    downtimeHours: { type: Number, default: 0 },
    maintenanceCost: { type: Number, default: 0 },
    siteName: { type: String },
    assetName: { type: String },
    technicianName: { type: String },
  },
  { timestamps: true },
);

analyticsSnapshotSchema.index(
  { tenantId: 1, period: 1, granularity: 1, siteId: 1, assetId: 1, technicianId: 1 },
  { unique: true },
);

export default mongoose.model<AnalyticsMetricSnapshot>('AnalyticsSnapshot', analyticsSnapshotSchema);
