/*
 * SPDX-License-Identifier: MIT
 */

import { Schema, Types, model, type Document } from 'mongoose';

export interface PartReservationDocument extends Document {
  tenantId: Types.ObjectId;
  siteId?: Types.ObjectId;
  part: Types.ObjectId;
  workOrder?: Types.ObjectId;
  quantity: number;
  neededBy?: Date;
  notes?: string;
  status: 'reserved' | 'consumed' | 'released';
  createdBy?: Types.ObjectId;
}

const partReservationSchema = new Schema<PartReservationDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', index: true },
    part: { type: Schema.Types.ObjectId, ref: 'InventoryPart', required: true },
    workOrder: { type: Schema.Types.ObjectId, ref: 'WorkOrder' },
    quantity: { type: Number, required: true },
    neededBy: Date,
    notes: String,
    status: { type: String, enum: ['reserved', 'consumed', 'released'], default: 'reserved' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

partReservationSchema.index({ tenantId: 1, part: 1, status: 1 });

export default model<PartReservationDocument>('InventoryPartReservation', partReservationSchema);
