/*
 * SPDX-License-Identifier: MIT
 */

import { Schema, Types, model, type Document } from 'mongoose';

export interface LocationDocument extends Document {
  tenantId: Types.ObjectId;
  siteId?: Types.ObjectId;
  name: string;
  store?: string;
  room?: string;
  bin?: string;
  parent?: Types.ObjectId;
  path: string[];
}

const locationSchema = new Schema<LocationDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', index: true },
    name: { type: String, required: true, trim: true },
    store: String,
    room: String,
    bin: String,
    parent: { type: Schema.Types.ObjectId, ref: 'InventoryLocation' },
    path: { type: [String], default: [] },
  },
  { timestamps: true },
);

locationSchema.index({ tenantId: 1, name: 1 }, { unique: true });

export default model<LocationDocument>('InventoryLocation', locationSchema);
