/*
 * SPDX-License-Identifier: MIT
 */

import { Schema, Types, model, type Document } from 'mongoose';

export interface ReorderSuggestionSource {
  type: 'low_stock_scan';
  runId: Types.ObjectId;
  generatedAt: Date;
  criteria: {
    thresholdField: 'minLevel' | 'reorderPoint';
    includeOnOrder: boolean;
    leadTimeBuffer: number;
  };
}

export interface ReorderSuggestionDocument extends Document {
  tenantId: Types.ObjectId;
  siteId?: Types.ObjectId;
  part: Types.ObjectId;
  targetLocation?: Types.ObjectId;
  suggestedQty: number;
  onHand: number;
  onOrder: number;
  threshold: number;
  leadTimeDays?: number;
  source: ReorderSuggestionSource;
  status: 'open' | 'dismissed';
  createdAt?: Date;
  updatedAt?: Date;
}

const reorderSuggestionSchema = new Schema<ReorderSuggestionDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', index: true },
    part: { type: Schema.Types.ObjectId, ref: 'InventoryPart', required: true },
    targetLocation: { type: Schema.Types.ObjectId, ref: 'InventoryLocation' },
    suggestedQty: { type: Number, required: true },
    onHand: { type: Number, required: true },
    onOrder: { type: Number, required: true },
    threshold: { type: Number, required: true },
    leadTimeDays: { type: Number },
    source: {
      type: {
        type: String,
        enum: ['low_stock_scan'],
        required: true,
      },
      runId: { type: Schema.Types.ObjectId, required: true },
      generatedAt: { type: Date, required: true },
      criteria: {
        thresholdField: { type: String, enum: ['minLevel', 'reorderPoint'], required: true },
        includeOnOrder: { type: Boolean, default: true },
        leadTimeBuffer: { type: Number, default: 0 },
      },
    },
    status: { type: String, enum: ['open', 'dismissed'], default: 'open' },
  },
  { timestamps: true },
);

reorderSuggestionSchema.index({ tenantId: 1, part: 1, 'source.type': 1 });

export default model<ReorderSuggestionDocument>('InventoryReorderSuggestion', reorderSuggestionSchema);
