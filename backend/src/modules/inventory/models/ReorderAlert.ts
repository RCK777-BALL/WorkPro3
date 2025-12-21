/*
 * SPDX-License-Identifier: MIT
 */

import { Schema, Types, model, type Document } from 'mongoose';

export type ReorderAlertStatus = 'open' | 'approved' | 'skipped' | 'resolved';

export interface ReorderAlertDocument extends Document {
  tenantId: Types.ObjectId;
  siteId?: Types.ObjectId | null;
  part: Types.ObjectId;
  stockItem?: Types.ObjectId | null;
  location?: Types.ObjectId | null;
  quantity: number;
  threshold: number;
  status: ReorderAlertStatus;
  triggeredAt: Date;
  lastSeenAt?: Date;
  resolvedAt?: Date;
  approvedAt?: Date;
  skippedAt?: Date;
  source?: {
    type: 'stock_scan';
    runId?: Types.ObjectId;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

const reorderAlertSchema = new Schema<ReorderAlertDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', index: true },
    part: { type: Schema.Types.ObjectId, ref: 'InventoryPart', required: true },
    stockItem: { type: Schema.Types.ObjectId, ref: 'InventoryStockItem' },
    location: { type: Schema.Types.ObjectId, ref: 'InventoryLocation' },
    quantity: { type: Number, required: true },
    threshold: { type: Number, required: true },
    status: {
      type: String,
      enum: ['open', 'approved', 'skipped', 'resolved'],
      default: 'open',
      index: true,
    },
    triggeredAt: { type: Date, default: Date.now },
    lastSeenAt: { type: Date },
    resolvedAt: { type: Date },
    approvedAt: { type: Date },
    skippedAt: { type: Date },
    source: {
      type: {
        type: String,
        enum: ['stock_scan'],
      },
      runId: { type: Schema.Types.ObjectId },
    },
  },
  { timestamps: true },
);

reorderAlertSchema.index(
  { tenantId: 1, part: 1, location: 1 },
  { unique: true, partialFilterExpression: { status: 'open' } },
);
reorderAlertSchema.index({ tenantId: 1, status: 1, triggeredAt: -1 });

export default model<ReorderAlertDocument>('InventoryReorderAlert', reorderAlertSchema);
