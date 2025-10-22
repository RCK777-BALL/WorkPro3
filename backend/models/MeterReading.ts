/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, {
  Schema,
  type HydratedDocument,
  type Model,
  type Types,
} from 'mongoose';

export interface MeterReading {
  meter: Types.ObjectId;
  value: number;
  timestamp: Date;
  tenantId: Types.ObjectId;
  siteId?: Types.ObjectId;
}

export type MeterReadingDocument = HydratedDocument<MeterReading>;

const meterReadingSchema = new Schema<MeterReading>(
  {
    meter: { type: Schema.Types.ObjectId, ref: 'Meter', required: true },
    value: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now },
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    siteId: {
      type: Schema.Types.ObjectId,
      ref: 'Site',
      index: true,
    },
  },
  { timestamps: true },
);

const MeterReadingModel: Model<MeterReading> = mongoose.model<MeterReading>(
  'MeterReading',
  meterReadingSchema,
);

export default MeterReadingModel;
