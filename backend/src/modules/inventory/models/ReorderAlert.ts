/*
 * SPDX-License-Identifier: MIT
 */

import { Schema, Types, model, type Document } from 'mongoose';

export type ReorderAlertStatus = 'open' | 'pending' | 'resolved';

export interface ReorderAlertDocument extends Document {
  tenantId: Types.ObjectId;
  siteId?: Types.ObjectId;
  part: Types.ObjectId;
  partStock?: Types.ObjectId;
  triggered_at?: Date;
  resolved_at?: Date;
  status: ReorderAlertStatus;
  quantity_on_hand?: number;
  reorder_point?: number;
  acknowledged_by?: Types.ObjectId;
  deleted_at?: Date | null;
  deleted_by?: Types.ObjectId;
  created_at?: Date;
  updated_at?: Date;
  created_by?: Types.ObjectId;
  updated_by?: Types.ObjectId;
}

const reorderAlertSchema = new Schema<ReorderAlertDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', index: true },
    part: { type: Schema.Types.ObjectId, ref: 'InventoryPart', required: true, index: true },
    partStock: { type: Schema.Types.ObjectId, ref: 'InventoryPartStock', index: true },
    triggered_at: { type: Date, default: Date.now },
    resolved_at: { type: Date },
    status: { type: String, enum: ['open', 'pending', 'resolved'], default: 'open', index: true },
    quantity_on_hand: { type: Number, default: 0 },
    reorder_point: { type: Number, default: 0 },
    acknowledged_by: { type: Schema.Types.ObjectId, ref: 'User' },
    deleted_at: { type: Date, default: null, index: true },
    deleted_by: { type: Schema.Types.ObjectId, ref: 'User' },
    created_by: { type: Schema.Types.ObjectId, ref: 'User' },
    updated_by: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

reorderAlertSchema.index({ tenantId: 1, part: 1, status: 1 });
reorderAlertSchema.index({ tenantId: 1, partStock: 1, status: 1 });
reorderAlertSchema.index(
  { tenantId: 1, part: 1, triggered_at: -1 },
  { partialFilterExpression: { deleted_at: null } },
);

export default model<ReorderAlertDocument>('InventoryReorderAlert', reorderAlertSchema);
