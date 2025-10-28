/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface ProductionRecordDoc extends Document {
  _id: Types.ObjectId;
  asset?: Types.ObjectId | null;
  site?: Types.ObjectId | null;
  tenantId: Types.ObjectId;
  recordedAt: Date;
  plannedUnits?: number | null;
  actualUnits?: number | null;
  goodUnits?: number | null;
  idealCycleTimeSec?: number | null;
  plannedTimeMinutes?: number | null;
  runTimeMinutes?: number | null;
  downtimeMinutes?: number | null;
  downtimeReason?: string | null;
  energyConsumedKwh?: number | null;
}

const productionRecordSchema = new Schema<ProductionRecordDoc>(
  {
    asset: { type: Schema.Types.ObjectId, ref: 'Asset', index: true },
    site: { type: Schema.Types.ObjectId, ref: 'Site', index: true },
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    recordedAt: { type: Date, default: Date.now, index: true },
    plannedUnits: { type: Number, default: 0 },
    actualUnits: { type: Number, default: 0 },
    goodUnits: { type: Number, default: 0 },
    idealCycleTimeSec: { type: Number, default: 0 },
    plannedTimeMinutes: { type: Number, default: 0 },
    runTimeMinutes: { type: Number, default: 0 },
    downtimeMinutes: { type: Number, default: 0 },
    downtimeReason: { type: String, default: 'unspecified' },
    energyConsumedKwh: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export default mongoose.model<ProductionRecordDoc>('ProductionRecord', productionRecordSchema);
