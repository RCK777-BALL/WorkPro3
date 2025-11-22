/*
 * SPDX-License-Identifier: MIT
 */

import { Schema, Types, model, type Document } from 'mongoose';

export interface StockHistoryDocument extends Document {
  tenantId: Types.ObjectId;
  siteId?: Types.ObjectId;
  part: Types.ObjectId;
  stockItem: Types.ObjectId;
  locationSnapshot: {
    locationId: Types.ObjectId;
    store?: string;
    room?: string;
    bin?: string;
  };
  delta: number;
  reason?: string;
  createdBy?: Types.ObjectId;
  createdAt: Date;
}

const stockHistorySchema = new Schema<StockHistoryDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', index: true },
    part: { type: Schema.Types.ObjectId, ref: 'InventoryPart', required: true },
    stockItem: { type: Schema.Types.ObjectId, ref: 'InventoryStockItem', required: true },
    locationSnapshot: {
      locationId: { type: Schema.Types.ObjectId, ref: 'InventoryLocation', required: true },
      store: String,
      room: String,
      bin: String,
    },
    delta: { type: Number, required: true },
    reason: String,
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

stockHistorySchema.index({ tenantId: 1, stockItem: 1, createdAt: -1 });

export default model<StockHistoryDocument>('InventoryStockHistory', stockHistorySchema);
