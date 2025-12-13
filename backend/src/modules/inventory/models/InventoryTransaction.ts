/*
 * SPDX-License-Identifier: MIT
 */

import { Schema, Types, model, type Document } from 'mongoose';

export type InventoryTransactionType = 'receipt' | 'issue' | 'adjustment' | 'transfer' | 'count';

export interface InventoryTransactionDocument extends Document {
  tenantId: Types.ObjectId;
  siteId?: Types.ObjectId;
  type: InventoryTransactionType;
  part: Types.ObjectId;
  quantity: number;
  from_bin?: Types.ObjectId;
  to_bin?: Types.ObjectId;
  reference?: string;
  idempotency_key?: string;
  created_at?: Date;
  updated_at?: Date;
  created_by?: Types.ObjectId;
  updated_by?: Types.ObjectId;
  performed_by?: Types.ObjectId;
  source_document_ref?: string;
}

const transactionSchema = new Schema<InventoryTransactionDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', index: true },
    type: { type: String, enum: ['receipt', 'issue', 'adjustment', 'transfer', 'count'], required: true },
    part: { type: Schema.Types.ObjectId, ref: 'InventoryPart', required: true, index: true },
    quantity: { type: Number, required: true },
    from_bin: { type: Schema.Types.ObjectId, ref: 'InventoryLocation', index: true },
    to_bin: { type: Schema.Types.ObjectId, ref: 'InventoryLocation', index: true },
    reference: { type: String, trim: true },
    idempotency_key: { type: String, trim: true },
    created_by: { type: Schema.Types.ObjectId, ref: 'User' },
    updated_by: { type: Schema.Types.ObjectId, ref: 'User' },
    performed_by: { type: Schema.Types.ObjectId, ref: 'User' },
    source_document_ref: { type: String, trim: true },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  },
);

transactionSchema.index(
  { tenantId: 1, idempotency_key: 1 },
  { unique: true, partialFilterExpression: { idempotency_key: { $exists: true } } },
);
transactionSchema.index({ tenantId: 1, part: 1, created_at: -1 });
transactionSchema.index({ tenantId: 1, from_bin: 1, created_at: -1 });
transactionSchema.index({ tenantId: 1, to_bin: 1, created_at: -1 });

export default model<InventoryTransactionDocument>('InventoryTransaction', transactionSchema);
