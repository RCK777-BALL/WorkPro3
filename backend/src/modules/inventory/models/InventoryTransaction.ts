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
  siteId?: Types.ObjectId;
  type: InventoryTransactionType;
  part: Types.ObjectId;
  quantity: number;
  delta: number;
  location?: Types.ObjectId;
  fromLocation?: Types.ObjectId;
  toLocation?: Types.ObjectId;
  reference?: string;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  performedBy?: Types.ObjectId;
  sourceDocumentRef?: string;
  locationQuantityAfter?: number;
  fromLocationQuantityAfter?: number;
  toLocationQuantityAfter?: number;
  partQuantityAfter?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const transactionSchema = new Schema<InventoryTransactionDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', index: true },
    type: { type: String, enum: ['receive', 'issue', 'adjust', 'transfer', 'stock_count'], required: true },
    part: { type: Schema.Types.ObjectId, ref: 'InventoryPart', required: true, index: true },
    quantity: { type: Number, required: true },
    delta: { type: Number, required: true },
    location: { type: Schema.Types.ObjectId, ref: 'InventoryLocation', index: true },
    fromLocation: { type: Schema.Types.ObjectId, ref: 'InventoryLocation', index: true },
    toLocation: { type: Schema.Types.ObjectId, ref: 'InventoryLocation', index: true },
    reference: { type: String, trim: true },
    idempotencyKey: { type: String, trim: true },
    metadata: { type: Schema.Types.Mixed },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    sourceDocumentRef: { type: String, trim: true },
    locationQuantityAfter: { type: Number },
    fromLocationQuantityAfter: { type: Number },
    toLocationQuantityAfter: { type: Number },
    partQuantityAfter: { type: Number },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } },
);

transactionSchema.index(
  { tenantId: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $exists: true } } },
);
transactionSchema.index({ tenantId: 1, part: 1, createdAt: -1 });
transactionSchema.index({ tenantId: 1, fromLocation: 1, createdAt: -1 });
transactionSchema.index({ tenantId: 1, toLocation: 1, createdAt: -1 });

export default model<InventoryTransactionDocument>('InventoryTransaction', transactionSchema);
