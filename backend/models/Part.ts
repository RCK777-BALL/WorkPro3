/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, Types, type Document } from 'mongoose';

export interface PartDocument extends Document {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  siteId?: Types.ObjectId;
  partNo: string;
  description?: string;
  unit?: string;
  cost?: number;
  minQty?: number;
  maxQty?: number;
  reorderPoint?: number;
  leadTime?: number;
  notes?: string;
}

const partSchema = new Schema<PartDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', index: true },
    partNo: { type: String, required: true, index: true },
    description: String,
    unit: String,
    cost: { type: Number, default: 0 },
    minQty: { type: Number, default: 0 },
    maxQty: { type: Number, default: 0 },
    reorderPoint: { type: Number, default: 0 },
    leadTime: { type: Number, default: 0 },
    notes: String,
  },
  { timestamps: true },
);

partSchema.index({ tenantId: 1, partNo: 1 }, { unique: true, partialFilterExpression: { partNo: { $exists: true } } });

export default mongoose.model<PartDocument>('Part', partSchema);
