/*
 * SPDX-License-Identifier: MIT
 */

import { Schema, model, type Document, type Model, Types } from 'mongoose';

export interface InventoryBinDocument extends Document {
  tenantId: Types.ObjectId;
  siteId?: Types.ObjectId;
  locationId?: Types.ObjectId;
  label: string;
  capacity?: number;
  createdAt: Date;
  updatedAt: Date;
}

const inventoryBinSchema = new Schema<InventoryBinDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', index: true },
    locationId: { type: Schema.Types.ObjectId, ref: 'Location', index: true },
    label: { type: String, required: true },
    capacity: { type: Number },
  },
  { timestamps: true },
);

inventoryBinSchema.index({ tenantId: 1, label: 1 }, { unique: true });

const InventoryBin: Model<InventoryBinDocument> = model<InventoryBinDocument>('InventoryBin', inventoryBinSchema);

export default InventoryBin;
