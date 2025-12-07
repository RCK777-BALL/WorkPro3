/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, type Types } from 'mongoose';

export type MetricsGranularity = 'day' | 'month';

export interface MetricsRollup {
  tenantId: Types.ObjectId;
  siteId?: Types.ObjectId;
  lineId?: Types.ObjectId;
  assetId?: Types.ObjectId;
  period: Date;
  granularity: MetricsGranularity;
  workOrders: number;
  completedWorkOrders: number;
  mttrHours: number;
  mtbfHours: number;
  pmTotal: number;
  pmCompleted: number;
  pmCompliance: number;
  downtimeMinutes: number;
  siteName?: string;
  lineName?: string;
  assetName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const metricsRollupSchema = new Schema<MetricsRollup>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', index: true },
    lineId: { type: Schema.Types.ObjectId, ref: 'Line', index: true },
    assetId: { type: Schema.Types.ObjectId, ref: 'Asset', index: true },
    period: { type: Date, required: true, index: true },
    granularity: { type: String, enum: ['day', 'month'], default: 'month', index: true },
    workOrders: { type: Number, default: 0 },
    completedWorkOrders: { type: Number, default: 0 },
    mttrHours: { type: Number, default: 0 },
    mtbfHours: { type: Number, default: 0 },
    pmTotal: { type: Number, default: 0 },
    pmCompleted: { type: Number, default: 0 },
    pmCompliance: { type: Number, default: 0 },
    downtimeMinutes: { type: Number, default: 0 },
    siteName: { type: String },
    lineName: { type: String },
    assetName: { type: String },
  },
  { timestamps: true },
);

metricsRollupSchema.index(
  { tenantId: 1, period: 1, granularity: 1, siteId: 1, lineId: 1, assetId: 1 },
  { unique: true },
);

export default mongoose.model<MetricsRollup>('MetricsRollup', metricsRollupSchema);
