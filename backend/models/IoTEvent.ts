/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface IoTEventDocument extends Document {
  tenantId: Types.ObjectId;
  triggerId?: Types.ObjectId;
  workOrderId?: Types.ObjectId;
  asset?: Types.ObjectId;
  metric?: string;
  value?: number;
  triggeredAt?: Date;
  payload?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}

const ioTEventSchema = new Schema<IoTEventDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    triggerId: { type: Schema.Types.ObjectId, ref: 'IoTTriggerConfig', index: true },
    workOrderId: { type: Schema.Types.ObjectId, ref: 'WorkOrder', index: true },
    asset: { type: Schema.Types.ObjectId, ref: 'Asset', index: true },
    metric: { type: String },
    value: { type: Number },
    triggeredAt: { type: Date, default: () => new Date(), index: true },
    payload: { type: Schema.Types.Mixed },
  },
  { timestamps: true, collection: 'iot_events' },
);

ioTEventSchema.index({ tenantId: 1, triggerId: 1, triggeredAt: -1 });

export default mongoose.model<IoTEventDocument>('IoTEvent', ioTEventSchema);
