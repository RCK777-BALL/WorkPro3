/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, type HydratedDocument, type Model, type Types } from 'mongoose';

export interface MeterReading {
  assetId: Types.ObjectId;
  value: number;
  createdAt: Date;
  tenantId: Types.ObjectId;
  siteId?: Types.ObjectId;
}

export type MeterReadingDocument = HydratedDocument<MeterReading>;

const meterReadingSchema = new Schema<MeterReading>(
  {
    assetId: { type: Schema.Types.ObjectId, ref: 'Asset', required: true, index: true },
    value: { type: Number, required: true, min: 0 },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', index: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

meterReadingSchema.virtual('id').get(function getId() {
  return this._id.toString();
});

const MeterReadingModel: Model<MeterReading> = mongoose.model<MeterReading>(
  'AssetMeterReading',
  meterReadingSchema,
);

export default MeterReadingModel;
