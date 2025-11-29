/*
 * SPDX-License-Identifier: MIT
 */

import { Schema, Types, model, type Document } from 'mongoose';

export interface LocationDocument extends Document {
  tenantId: Types.ObjectId;
  siteId?: Types.ObjectId | undefined;
  store: string;
  room?: string | undefined;
  bin?: string | undefined;
}

const locationSchema = new Schema<LocationDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', index: true },
    store: { type: String, required: true, trim: true },
    room: { type: String, trim: true },
    bin: { type: String, trim: true },
  },
  { timestamps: true },
);

locationSchema.index({ tenantId: 1, siteId: 1, store: 1, room: 1, bin: 1 }, { unique: true });

export default model<LocationDocument>('InventoryLocation', locationSchema);
