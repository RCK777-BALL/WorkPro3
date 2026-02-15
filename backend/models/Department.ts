/*
 * SPDX-License-Identifier: MIT
 */

import { Schema, model, Types, Document } from 'mongoose';

export interface StationSubdoc {
  _id: Types.ObjectId;
  name: string;
  assets: Types.Array<Types.ObjectId>;
  notes?: string;
  tenantId?: Types.ObjectId;
  siteId?: Types.ObjectId;
  lineId?: Types.ObjectId;
}

export interface LineSubdoc {
  _id: Types.ObjectId;
  name: string;
  stations: Types.DocumentArray<StationSubdoc>;
  tenantId?: Types.ObjectId;
  siteId?: Types.ObjectId;
  notes?: string;
}

export interface DepartmentDoc extends Document {
  _id: Types.ObjectId;
  name: string;
  tenantId: Types.ObjectId;
  plant: Types.ObjectId;
  lines: Types.DocumentArray<LineSubdoc>;
  notes?: string;
  siteId?: Types.ObjectId;
}

const StationSchema = new Schema<StationSubdoc>({
  name: { type: String, required: true },
  notes: { type: String, default: '' },
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant' },
  siteId: { type: Schema.Types.ObjectId, ref: 'Site', index: true },
  lineId: { type: Schema.Types.ObjectId, ref: 'Line' },
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
  siteId: { type: Schema.Types.ObjectId, ref: 'Site', required: false },
  notes: { type: String, default: '' },
  stations: { type: [StationSchema], default: [] },
});

const DepartmentSchema = new Schema<DepartmentDoc>(
  {
    name: { type: String, required: true },
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    plant: { type: Schema.Types.ObjectId, ref: 'Plant', required: true, index: true },
    notes: { type: String, default: '' },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', required: false, index: true },
    lines: { type: [LineSchema], default: [] },
  },
  { timestamps: true }
);

DepartmentSchema.index({ tenantId: 1, plant: 1, name: 1 });
DepartmentSchema.index({ tenantId: 1, siteId: 1 });

DepartmentSchema.pre('validate', function () {
  if (!this.plant && this.siteId) {
    this.plant = this.siteId as Types.ObjectId;
  }
});

const Department = model<DepartmentDoc>('Department', DepartmentSchema);
export default Department;

