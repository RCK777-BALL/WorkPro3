/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, {
  Schema,
  type HydratedDocument,
  type Model,
  type Types,
} from 'mongoose';

export interface Meter {
  asset: Types.ObjectId;
  name: string;
  unit: string;
  currentValue: number;
  pmInterval: number;
  lastWOValue: number;
  thresholds?: {
    warning?: number;
    critical?: number;
  };
  tenantId: Types.ObjectId;
  siteId?: Types.ObjectId;
}

export type MeterDocument = HydratedDocument<Meter>;

const meterSchema = new Schema<Meter>(
  {
    asset: { type: Schema.Types.ObjectId, ref: 'Asset', required: true },
    name: { type: String, required: true },
    unit: { type: String, required: true },
    currentValue: { type: Number, default: 0 },
    pmInterval: { type: Number, required: true },
    lastWOValue: { type: Number, default: 0 },
    thresholds: {
      warning: { type: Number },
      critical: { type: Number },
    },
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

const MeterModel: Model<Meter> = mongoose.model<Meter>('Meter', meterSchema);

export default MeterModel;
