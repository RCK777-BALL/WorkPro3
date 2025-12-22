/*
 * SPDX-License-Identifier: MIT
 */

import { Schema, Types, model, type Document } from 'mongoose';

type MovementType = 'reserve' | 'unreserve' | 'issue' | 'return' | 'receive';

export interface InventoryMovementDocument extends Document {
  tenantId: Types.ObjectId;
  siteId?: Types.ObjectId;
  workOrderId?: Types.ObjectId;
  partId: Types.ObjectId;
  stockId?: Types.ObjectId;
  type: MovementType;
  quantity: number;
  onHandAfter?: number;
  reservedAfter?: number;
  createdBy?: Types.ObjectId;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}

const movementSchema = new Schema<InventoryMovementDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', index: true },
    workOrderId: { type: Schema.Types.ObjectId, ref: 'WorkOrder', index: true },
    partId: { type: Schema.Types.ObjectId, ref: 'InventoryPart', required: true, index: true },
    stockId: { type: Schema.Types.ObjectId, ref: 'PartStock', index: true },
    type: { type: String, enum: ['reserve', 'unreserve', 'issue', 'return', 'receive'], required: true },
    quantity: { type: Number, required: true },
    onHandAfter: Number,
    reservedAfter: Number,
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

movementSchema.index({ tenantId: 1, workOrderId: 1, createdAt: -1 });

export default model<InventoryMovementDocument>('InventoryMovement', movementSchema);
