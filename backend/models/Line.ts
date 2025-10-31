/*
 * SPDX-License-Identifier: MIT
 */

import { Schema, model, type Document, type Types } from 'mongoose';

export interface LineDoc extends Document {
  _id: Types.ObjectId;
  name: string;
  departmentId: Types.ObjectId;
  tenantId: Types.ObjectId;
  plant: Types.ObjectId;
  siteId?: Types.ObjectId;
  notes?: string;
  stations: Types.Array<Types.ObjectId>;
}

const LineSchema = new Schema<LineDoc>(
  {
    name: { type: String, required: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true, index: true },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    plant: { type: Schema.Types.ObjectId, ref: 'Plant', required: true, index: true },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', required: false, index: true },
    notes: { type: String, default: '' },
    stations: { type: [Schema.Types.ObjectId], ref: 'Station', default: [] },
  },
  { timestamps: true },
);

const Line = model<LineDoc>('Line', LineSchema);
export default Line;
