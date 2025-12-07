/*
 * SPDX-License-Identifier: MIT
 */

import mongoose from 'mongoose';

const sensorDeviceSchema = new mongoose.Schema(
  {
    deviceId: { type: String, required: true },
    name: { type: String },
    asset: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', required: true },
    status: { type: String, enum: ['online', 'offline', 'unknown'], default: 'unknown' },
    metrics: [
      {
        name: { type: String, required: true },
        unit: { type: String },
        threshold: { type: Number },
      },
    ],
    lastSeenAt: { type: Date },
    lastMetric: { type: String },
    lastValue: { type: Number },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
  },
  { timestamps: true },
);

sensorDeviceSchema.index({ tenantId: 1, deviceId: 1 }, { unique: true });

export default mongoose.model('SensorDevice', sensorDeviceSchema);
