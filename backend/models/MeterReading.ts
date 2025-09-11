/*
 * SPDX-License-Identifier: MIT
 */

import mongoose from 'mongoose';

const meterReadingSchema = new mongoose.Schema(
  {
    meter: { type: mongoose.Schema.Types.ObjectId, ref: 'Meter', required: true },
    value: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    siteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Site',
      index: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model('MeterReading', meterReadingSchema);
