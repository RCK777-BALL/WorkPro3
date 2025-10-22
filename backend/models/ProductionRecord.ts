/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, {
  Schema,
  type HydratedDocument,
  type Model,
  type Types,
} from 'mongoose';

export interface ProductionRecord {
  _id: Types.ObjectId;
  asset?: Types.ObjectId;
  site?: Types.ObjectId;
  tenantId: Types.ObjectId;
  recordedAt: Date;
  plannedUnits?: number;
  actualUnits?: number;
  goodUnits?: number;
  idealCycleTimeSec?: number;
  plannedTimeMinutes?: number;
  runTimeMinutes?: number;
  downtimeMinutes?: number;
  downtimeReason?: string;
  energyConsumedKwh?: number;
}

export type ProductionRecordDocument = HydratedDocument<ProductionRecord>;

const productionRecordSchema = new Schema<ProductionRecord>(
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

const ProductionRecordModel: Model<ProductionRecord> = mongoose.model<ProductionRecord>(
  'ProductionRecord',
  productionRecordSchema,
);

export default ProductionRecordModel;
