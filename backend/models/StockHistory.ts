/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, Types, type Document } from 'mongoose';

export interface StockHistoryDocument extends Document {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  siteId?: Types.ObjectId;
  stockItem: Types.ObjectId;
  part?: Types.ObjectId;
  delta: number;
  reason?: string;
  userId?: Types.ObjectId;
  balance?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const stockHistorySchema = new Schema<StockHistoryDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', index: true },
    stockItem: { type: Schema.Types.ObjectId, ref: 'StockItem', required: true, index: true },
    part: { type: Schema.Types.ObjectId, ref: 'Part', index: true },
    delta: { type: Number, required: true },
    reason: String,
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    balance: Number,
  },
  { timestamps: true },
);

export default mongoose.model<StockHistoryDocument>('StockHistory', stockHistorySchema);
