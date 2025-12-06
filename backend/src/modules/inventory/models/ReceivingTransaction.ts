/*
 * SPDX-License-Identifier: MIT
 */

import { Schema, Types, model, type Document } from 'mongoose';

export interface ReceivingTransactionDocument extends Document {
  tenantId: Types.ObjectId;
  siteId?: Types.ObjectId;
  purchaseOrder?: Types.ObjectId;
  part: Types.ObjectId;
  location?: Types.ObjectId;
  quantity: number;
  unitCost?: number;
  reference?: string;
  receivedAt?: Date;
  recordedBy?: Types.ObjectId;
}

const receivingTransactionSchema = new Schema<ReceivingTransactionDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', index: true },
    purchaseOrder: { type: Schema.Types.ObjectId, ref: 'InventoryPurchaseOrder' },
    part: { type: Schema.Types.ObjectId, ref: 'InventoryPart', required: true },
    location: { type: Schema.Types.ObjectId, ref: 'InventoryLocation' },
    quantity: { type: Number, required: true },
    unitCost: Number,
    reference: String,
    receivedAt: { type: Date, default: Date.now },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

receivingTransactionSchema.index({ tenantId: 1, part: 1, createdAt: -1 });

export default model<ReceivingTransactionDocument>('InventoryReceiving', receivingTransactionSchema);
