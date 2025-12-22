/*
 * SPDX-License-Identifier: MIT
 */

import { Schema, Types, model, type Document } from 'mongoose';

export type InventoryMovementType = 'receive' | 'adjust';

export interface InventoryMovementDocument extends Document {
  tenantId: Types.ObjectId;
  partId: Types.ObjectId;
  stockId: Types.ObjectId;
  type: InventoryMovementType;
  quantity: number;
  reason?: string;
  metadata?: Record<string, unknown>;
  created_at?: Date;
}

const inventoryMovementSchema = new Schema<InventoryMovementDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    partId: { type: Schema.Types.ObjectId, ref: 'InventoryPartV2', required: true },
    stockId: { type: Schema.Types.ObjectId, ref: 'InventoryPartStock', required: true },
    type: { type: String, enum: ['receive', 'adjust'], required: true },
    quantity: { type: Number, required: true },
    reason: { type: String },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } },
);

inventoryMovementSchema.index({ tenantId: 1, stockId: 1, created_at: -1 });

export default model<InventoryMovementDocument>('InventoryMovementV2', inventoryMovementSchema);
