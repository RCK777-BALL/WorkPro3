/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, Types, Document } from 'mongoose';

export interface Adjustment {
  delta: number;
  reason: string;
  woId?: Types.ObjectId;
  date: Date;
}

export interface IPart extends Document {
  tenantId: Types.ObjectId;
  name: string;
  description?: string;
  category?: string;
  sku?: string;
  location?: string;
  onHand: number;
  unitCost?: number;
  reorderPoint?: number;
  reorderThreshold?: number;
  lastRestockDate?: Date;
  vendor?: Types.ObjectId;
  lastOrderDate?: Date;
  image?: string;
  adjustments: Adjustment[];
}

const adjustmentSchema = new Schema<Adjustment>(
  {
    delta: { type: Number, required: true },
    reason: { type: String, required: true },
    woId: { type: Schema.Types.ObjectId, ref: 'WorkOrder' },
    date: { type: Date, default: Date.now }
  },
  { _id: false }
);

const partSchema = new Schema<IPart>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true },
    description: String,
    category: String,
    sku: { type: String, index: true },
    location: String,
    onHand: { type: Number, default: 0 },
    unitCost: { type: Number, default: 0 },
    reorderPoint: { type: Number, default: 0 },
    reorderThreshold: { type: Number, default: 0 },
    lastRestockDate: Date,
    vendor: { type: Schema.Types.ObjectId, ref: 'Vendor' },
    lastOrderDate: Date,
    image: String,
    adjustments: [adjustmentSchema]
  },
  { timestamps: true }
);

export default mongoose.model<IPart>('Part', partSchema);

