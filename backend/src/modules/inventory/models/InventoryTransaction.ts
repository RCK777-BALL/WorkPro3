/*
 * SPDX-License-Identifier: MIT
 */

import { Schema, Types, model, type Document } from 'mongoose';

export type InventoryTransactionType =
  | 'receive'
  | 'issue'
  | 'adjust'
  | 'transfer'
  | 'stock_count';

export interface InventoryTransactionDocument extends Document {
  tenantId: Types.ObjectId;
  siteId?: Types.ObjectId | undefined;
  part: Types.ObjectId;
  location?: Types.ObjectId | undefined;
  fromLocation?: Types.ObjectId | undefined;
  toLocation?: Types.ObjectId | undefined;
  type: InventoryTransactionType;
  quantity: number;
  delta: number;
  idempotencyKey: string;
  metadata?: Record<string, unknown> | undefined;
  createdBy?: Types.ObjectId | undefined;
  locationQuantityAfter?: number | undefined;
  fromLocationQuantityAfter?: number | undefined;
  toLocationQuantityAfter?: number | undefined;
  partQuantityAfter?: number | undefined;
  createdAt: Date;
}

const transactionSchema = new Schema<InventoryTransactionDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', index: true },
    part: { type: Schema.Types.ObjectId, ref: 'InventoryPart', required: true },
    location: { type: Schema.Types.ObjectId, ref: 'InventoryLocation' },
    fromLocation: { type: Schema.Types.ObjectId, ref: 'InventoryLocation' },
    toLocation: { type: Schema.Types.ObjectId, ref: 'InventoryLocation' },
    type: {
      type: String,
      enum: ['receive', 'issue', 'adjust', 'transfer', 'stock_count'],
      required: true,
    },
    quantity: { type: Number, required: true },
    delta: { type: Number, required: true },
    idempotencyKey: { type: String, required: true },
    metadata: Schema.Types.Mixed,
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    locationQuantityAfter: Number,
    fromLocationQuantityAfter: Number,
    toLocationQuantityAfter: Number,
    partQuantityAfter: Number,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

transactionSchema.index({ tenantId: 1, idempotencyKey: 1 }, { unique: true });

export default model<InventoryTransactionDocument>('InventoryTransaction', transactionSchema);
