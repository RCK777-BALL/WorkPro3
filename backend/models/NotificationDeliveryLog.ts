/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';
import type { NotificationChannel } from './NotificationTemplate';

export type DeliveryStatus = 'pending' | 'sent' | 'failed' | 'deferred' | 'queued';

export interface NotificationDeliveryLogDocument extends Document {
  _id: Types.ObjectId;
  notificationId: Types.ObjectId;
  tenantId: Types.ObjectId;
  subscriptionId?: Types.ObjectId;
  channel: NotificationChannel;
  attempt: number;
  status: DeliveryStatus;
  event?: string;
  target?: string;
  nextAttemptAt?: Date;
  metadata?: Record<string, unknown>;
  errorMessage?: string;
  createdAt: Date;
}

const notificationDeliveryLogSchema = new Schema<NotificationDeliveryLogDocument>(
  {
    notificationId: { type: Schema.Types.ObjectId, ref: 'Notification', required: true },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    subscriptionId: { type: Schema.Types.ObjectId, ref: 'NotificationSubscription' },
    channel: { type: String, enum: ['email', 'outlook', 'push', 'in_app', 'webhook', 'teams'], required: true },
    attempt: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'sent', 'failed', 'deferred', 'queued'], required: true },
    event: { type: String },
    target: { type: String },
    nextAttemptAt: { type: Date },
    metadata: { type: Schema.Types.Mixed },
    errorMessage: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

notificationDeliveryLogSchema.index({ notificationId: 1 });
notificationDeliveryLogSchema.index({ tenantId: 1, channel: 1 });

const NotificationDeliveryLog: Model<NotificationDeliveryLogDocument> = mongoose.model<NotificationDeliveryLogDocument>(
  'NotificationDeliveryLog',
  notificationDeliveryLogSchema,
);

export default NotificationDeliveryLog;
