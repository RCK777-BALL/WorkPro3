/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, {
  Schema,
  type HydratedDocument,
  type InferSchemaType,
  type Model,
} from 'mongoose';

const productionRecordSchema = new Schema(
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

export type ProductionRecord = InferSchemaType<typeof productionRecordSchema>;
export type ProductionRecordDocument = HydratedDocument<ProductionRecord>;
export type ProductionRecordModel = Model<ProductionRecordDocument>;

const ProductionRecord = mongoose.model<ProductionRecord>(
  'ProductionRecord',
  productionRecordSchema,
);

export default ProductionRecord;
