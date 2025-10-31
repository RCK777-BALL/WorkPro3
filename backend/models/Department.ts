/*
 * SPDX-License-Identifier: MIT
 */

import { Schema, model, Types, Document } from 'mongoose';

export interface StationSubdoc {
  _id: Types.ObjectId;
  name: string;
  assets: Types.Array<Types.ObjectId>;
  notes?: string;
}

export interface LineSubdoc {
  _id: Types.ObjectId;
  name: string;
  stations: Types.DocumentArray<StationSubdoc>;
  tenantId?: Types.ObjectId;
  notes?: string;
}

export interface DepartmentDoc extends Document {
  _id: Types.ObjectId;
  name: string;
  tenantId: Types.ObjectId;
  lines: Types.DocumentArray<LineSubdoc>;
  notes?: string;
  siteId?: Types.ObjectId;
  plant?: Types.ObjectId;
}

const StationSchema = new Schema<StationSubdoc>({
  name: { type: String, required: true },
  notes: { type: String, default: '' },
  assets: {
    type: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Asset',
      },
    ],
    default: [],
  },
});

const LineSchema = new Schema<LineSubdoc>({
  name: { type: String, required: true },
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: false },
  notes: { type: String, default: '' },
  stations: { type: [StationSchema], default: [] },
});

const DepartmentSchema = new Schema<DepartmentDoc>(
  {
    name: { type: String, required: true },
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    notes: { type: String, default: '' },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', required: false, index: true },
    plant: { type: Schema.Types.ObjectId, ref: 'Plant', required: false, index: true },
    lines: { type: [LineSchema], default: [] },
  },
  { timestamps: true }
);

DepartmentSchema.pre('validate', function (next) {
  if (!this.plant && this.siteId) {
    this.plant = this.siteId as Types.ObjectId;
  }
  next();
});

const Department = model<DepartmentDoc>('Department', DepartmentSchema);
export default Department;

