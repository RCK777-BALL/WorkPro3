/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';

const FAR_FUTURE = new Date('9999-12-31T23:59:59.999Z');

export interface DowntimeEventDocument extends Document {
  tenantId: Types.ObjectId;
  assetId: Types.ObjectId;
  workOrderId?: Types.ObjectId;
  start: Date;
  end?: Date;
  causeCode: string;
  reason: string;
  impactMinutes?: number;
  createdAt: Date;
  updatedAt: Date;
}

const downtimeEventSchema = new Schema<DowntimeEventDocument>(
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
    workOrderId: {
      type: Schema.Types.ObjectId,
      ref: 'WorkOrder',
      index: true,
    },
    start: { type: Date, required: true },
    end: {
      type: Date,
      validate: {
        validator(this: unknown, value?: Date) {
          const start = (this as DowntimeEventDocument).start;
          return !value || value > start;
        },
        message: 'End time must be after start time',
      },
    },
    causeCode: { type: String, required: true, trim: true, minlength: 1 },
    reason: { type: String, required: true, trim: true, minlength: 1 },
    impactMinutes: { type: Number, min: 0 },
  },
  { timestamps: true },
);

downtimeEventSchema.index({ tenantId: 1, assetId: 1, start: -1 });
downtimeEventSchema.index({ tenantId: 1, workOrderId: 1 });

async function hasOverlap(
  model: Model<DowntimeEventDocument>,
  doc: DowntimeEventDocument,
): Promise<boolean> {
  const effectiveEnd = doc.end ?? FAR_FUTURE;

  const query: mongoose.FilterQuery<DowntimeEventDocument> = {
    tenantId: doc.tenantId,
    assetId: doc.assetId,
    _id: { $ne: doc._id },
    start: { $lt: effectiveEnd },
    $or: [{ end: { $exists: false } }, { end: { $gt: doc.start } }],
  };

  const overlap = await model.exists(query).lean();
  return Boolean(overlap);
}

downtimeEventSchema.pre('save', async function validateOverlap() {
  const model = this.constructor as Model<DowntimeEventDocument>;
  const conflict = await hasOverlap(model, this as unknown as DowntimeEventDocument);

  if (conflict) {
    throw new Error('Downtime events may not overlap for the same asset');
  }
});

const DowntimeEvent = mongoose.model<DowntimeEventDocument>('DowntimeEvent', downtimeEventSchema);

export default DowntimeEvent;
