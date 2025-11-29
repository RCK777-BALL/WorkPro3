/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface DowntimeLogDocument extends Document {
  tenantId: Types.ObjectId;
  assetId: Types.ObjectId;
  start: Date;
  end?: Date;
  reason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const downtimeLogSchema = new Schema<DowntimeLogDocument>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    assetId: {
      type: Schema.Types.ObjectId,
      ref: 'Asset',
      required: true,
      index: true,
    },
    start: { type: Date, required: true },
    end: { type: Date },
    reason: { type: String },
  },
  { timestamps: true },
);

downtimeLogSchema.index({ tenantId: 1, assetId: 1, start: -1 });

export default mongoose.model<DowntimeLogDocument>('DowntimeLog', downtimeLogSchema);
