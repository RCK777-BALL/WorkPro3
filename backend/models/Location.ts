/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, Types, type Document } from 'mongoose';

export interface LocationDocument extends Document {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  siteId?: Types.ObjectId;
  name: string;
  store?: string;
  room?: string;
  bin?: string;
}

const locationSchema = new Schema<LocationDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', index: true },
    name: { type: String, required: true },
    store: String,
    room: String,
    bin: String,
  },
  { timestamps: true },
);

locationSchema.index({ tenantId: 1, name: 1 }, { unique: true });

export default mongoose.model<LocationDocument>('Location', locationSchema);
