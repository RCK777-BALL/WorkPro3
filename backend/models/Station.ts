/*
 * SPDX-License-Identifier: MIT
 */

import { Schema, model, type Document, type Types } from 'mongoose';

export interface StationDoc extends Document {
  _id: Types.ObjectId;
  name: string;
  lineId: Types.ObjectId;
  departmentId: Types.ObjectId;
  tenantId: Types.ObjectId;
  plant: Types.ObjectId;
  siteId?: Types.ObjectId;
  plant?: Types.ObjectId;
  notes?: string;
}

const StationSchema = new Schema<StationDoc>(
  {
    name: { type: String, required: true },
    lineId: { type: Schema.Types.ObjectId, ref: 'Line', required: true, index: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true, index: true },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    plant: { type: Schema.Types.ObjectId, ref: 'Plant', required: true, index: true },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', required: false, index: true },
    plant: { type: Schema.Types.ObjectId, ref: 'Plant', required: false, index: true },
    notes: { type: String, default: '' },
  },
  { timestamps: true },
);

StationSchema.pre('validate', function (next) {
  if (!this.plant && this.siteId) {
    this.plant = this.siteId as Types.ObjectId;
  }
  next();
});

const Station = model<StationDoc>('Station', StationSchema);
export default Station;
