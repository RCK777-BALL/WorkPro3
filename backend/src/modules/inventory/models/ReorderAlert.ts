/*
 * SPDX-License-Identifier: MIT
 */

import { Schema, Types, model, type Document } from 'mongoose';

export type ReorderAlertStatus = 'open' | 'approved' | 'skipped' | 'resolved';

export interface ReorderAlertDocument extends Document {
  tenantId: Types.ObjectId;
  siteId?: Types.ObjectId;
  part: Types.ObjectId;
  partStock?: Types.ObjectId;
  stockItem?: Types.ObjectId;
  location?: Types.ObjectId;
  quantity: number;
  threshold: number;
  status: ReorderAlertStatus;
  lastSeenAt?: Date;
  triggeredAt?: Date;
  resolvedAt?: Date;
  approvedAt?: Date;
  skippedAt?: Date;
  acknowledgedBy?: Types.ObjectId;
  deletedAt?: Date | null;
  deletedBy?: Types.ObjectId;
  source?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const reorderAlertSchema = new Schema<ReorderAlertDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', index: true },
    part: { type: Schema.Types.ObjectId, ref: 'InventoryPart', required: true, index: true },
    partStock: { type: Schema.Types.ObjectId, ref: 'InventoryPartStock', index: true },
    stockItem: { type: Schema.Types.ObjectId, ref: 'InventoryPartStock', index: true },
    location: { type: Schema.Types.ObjectId, ref: 'InventoryLocation', index: true },
    quantity: { type: Number, default: 0 },
    threshold: { type: Number, default: 0 },
    status: { type: String, enum: ['open', 'approved', 'skipped', 'resolved'], default: 'open', index: true },
    lastSeenAt: { type: Date },
    triggeredAt: { type: Date },
    resolvedAt: { type: Date },
    approvedAt: { type: Date },
    skippedAt: { type: Date },
    acknowledgedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    deletedAt: { type: Date, default: null, index: true },
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    source: { type: String },
  },
  { timestamps: true },
);

reorderAlertSchema.index({ tenantId: 1, part: 1, status: 1 });
reorderAlertSchema.index({ tenantId: 1, partStock: 1, status: 1 });
reorderAlertSchema.index({ tenantId: 1, part: 1, triggeredAt: -1 }, { partialFilterExpression: { deletedAt: null } });

export default model<ReorderAlertDocument>('InventoryReorderAlert', reorderAlertSchema);
