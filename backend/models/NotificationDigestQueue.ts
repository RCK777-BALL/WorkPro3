/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';
import type { NotificationChannel } from './NotificationTemplate';

export interface NotificationDigestQueueDocument extends Document {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  subscriptionId: Types.ObjectId;
  channel: NotificationChannel;
  notificationIds: Types.ObjectId[];
  deliverAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const notificationDigestQueueSchema = new Schema<NotificationDigestQueueDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    subscriptionId: { type: Schema.Types.ObjectId, ref: 'NotificationSubscription', required: true },
    channel: { type: String, enum: ['email', 'push', 'in_app', 'webhook'], required: true },
    notificationIds: { type: [Schema.Types.ObjectId], ref: 'Notification', required: true },
    deliverAt: { type: Date, required: true },
  },
  { timestamps: true },
);

notificationDigestQueueSchema.index({ deliverAt: 1 });
notificationDigestQueueSchema.index({ subscriptionId: 1, channel: 1 }, { unique: false });

const NotificationDigestQueue: Model<NotificationDigestQueueDocument> = mongoose.model<NotificationDigestQueueDocument>(
  'NotificationDigestQueue',
  notificationDigestQueueSchema,
);

export default NotificationDigestQueue;
