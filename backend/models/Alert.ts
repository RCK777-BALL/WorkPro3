/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface AlertDocument extends Document {
  _id: Types.ObjectId;
  plant: Types.ObjectId;
  tenantId?: Types.ObjectId;
  type: 'downtime' | 'wrenchTime' | 'pmCompliance';
  level: 'info' | 'warning' | 'critical';
  message: string;
  resolved: boolean;
  timestamp: Date;
}

const alertSchema = new Schema<AlertDocument>(
  {
    plant: { type: Schema.Types.ObjectId, ref: 'Plant', required: true, index: true },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', index: true },
    type: {
      type: String,
      enum: ['downtime', 'wrenchTime', 'pmCompliance'],
      required: true,
    },
    level: {
      type: String,
      enum: ['info', 'warning', 'critical'],
      default: 'info',
    },
    message: { type: String, required: true },
    resolved: { type: Boolean, default: false },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

alertSchema.index({ tenantId: 1, createdAt: -1 });

export default mongoose.model<AlertDocument>('Alert', alertSchema);
