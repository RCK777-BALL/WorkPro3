/*
 * SPDX-License-Identifier: MIT
 */

import { Schema, Types, model, type Document } from 'mongoose';

export interface LocationDocument extends Document {
  tenantId: Types.ObjectId;
  siteId?: Types.ObjectId | undefined;
  code: string;
  warehouse?: string;
  store: string;
  room?: string | undefined;
  bin?: string | undefined;
  barcode?: string;
  capacity?: number;
  notes?: string;
  created_at?: Date;
  updated_at?: Date;
  created_by?: Types.ObjectId;
  updated_by?: Types.ObjectId;
}

const locationSchema = new Schema<LocationDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', index: true },
    code: { type: String, required: true, trim: true },
    warehouse: { type: String, trim: true },
    store: { type: String, required: true, trim: true },
    room: { type: String, trim: true },
    bin: { type: String, trim: true },
    barcode: { type: String, trim: true },
    capacity: { type: Number },
    notes: { type: String },
    created_by: { type: Schema.Types.ObjectId, ref: 'User' },
    updated_by: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

locationSchema.index({ tenantId: 1, code: 1 }, { unique: true });
locationSchema.index({ tenantId: 1, siteId: 1, store: 1, room: 1, bin: 1 }, { unique: true });
locationSchema.index({ tenantId: 1, warehouse: 1 });
locationSchema.index({ tenantId: 1, barcode: 1 }, { unique: true, partialFilterExpression: { barcode: { $exists: true } } });

export default model<LocationDocument>('InventoryLocation', locationSchema);
