/*
 * SPDX-License-Identifier: MIT
 */

import { Schema, Types, model, type Document } from 'mongoose';

export interface PartStockDocument extends Document {
  tenantId: Types.ObjectId;
  siteId?: Types.ObjectId;
  partId: Types.ObjectId;
  locationId?: Types.ObjectId;
  onHand: number;
  reserved: number;
  unitCost?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const partStockSchema = new Schema<PartStockDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', index: true },
    partId: { type: Schema.Types.ObjectId, ref: 'InventoryPart', required: true, index: true },
    locationId: { type: Schema.Types.ObjectId, ref: 'InventoryLocation', index: true },
    onHand: { type: Number, default: 0 },
    reserved: { type: Number, default: 0 },
    unitCost: { type: Number, default: 0 },
  },
  { timestamps: true },
);

partStockSchema.index({ tenantId: 1, partId: 1, locationId: 1 }, { unique: true });

export default model<PartStockDocument>('PartStock', partStockSchema);
