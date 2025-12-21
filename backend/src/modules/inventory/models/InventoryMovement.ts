/*
 * SPDX-License-Identifier: MIT
 */

import { Schema, Types, model, type Document } from 'mongoose';

export type MovementType = 'receive' | 'issue' | 'adjust' | 'transfer' | 'count';

export interface InventoryMovementDocument extends Document {
  tenantId: Types.ObjectId;
  siteId?: Types.ObjectId;
  part: Types.ObjectId;
  location: Types.ObjectId;
  partStock?: Types.ObjectId;
  type: MovementType;
  quantity: number;
  unit_cost?: number;
  reason?: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
  idempotencyKey?: string;
  deleted_at?: Date | null;
  deleted_by?: Types.ObjectId;
  created_at?: Date;
  updated_at?: Date;
  created_by?: Types.ObjectId;
  updated_by?: Types.ObjectId;
}

const inventoryMovementSchema = new Schema<InventoryMovementDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', index: true },
    part: { type: Schema.Types.ObjectId, ref: 'InventoryPart', required: true, index: true },
    location: { type: Schema.Types.ObjectId, ref: 'InventoryStockLocation', required: true, index: true },
    partStock: { type: Schema.Types.ObjectId, ref: 'InventoryPartStock', index: true },
    type: { type: String, enum: ['receive', 'issue', 'adjust', 'transfer', 'count'], required: true },
    quantity: { type: Number, required: true },
    unit_cost: { type: Number, default: 0 },
    reason: { type: String },
    metadata: { type: Schema.Types.Mixed },
    tags: [{ type: String, trim: true }],
    idempotencyKey: { type: String, trim: true, index: true },
    deleted_at: { type: Date, default: null, index: true },
    deleted_by: { type: Schema.Types.ObjectId, ref: 'User' },
    created_by: { type: Schema.Types.ObjectId, ref: 'User' },
    updated_by: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

inventoryMovementSchema.index({ tenantId: 1, part: 1, created_at: -1 });
inventoryMovementSchema.index({ tenantId: 1, location: 1, created_at: -1 });
inventoryMovementSchema.index({ tenantId: 1, type: 1, created_at: -1 });
inventoryMovementSchema.index({ tenantId: 1, idempotencyKey: 1 }, { unique: true, partialFilterExpression: { idempotencyKey: { $exists: true } } });

export default model<InventoryMovementDocument>('InventoryMovement', inventoryMovementSchema);
