/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';
import type { NotificationChannel } from './NotificationTemplate';

export interface QuietHours {
  start: string; // HH:mm
  end: string; // HH:mm
}

export interface DigestPreference {
  enabled: boolean;
  frequency: 'hourly' | 'daily' | 'weekly';
}

export interface NotificationSubscriptionDocument extends Document {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  userId?: Types.ObjectId;
  group?: string;
  events: string[];
  channels: NotificationChannel[];
  quietHours?: QuietHours;
  digest?: DigestPreference;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSubscriptionSchema = new Schema<NotificationSubscriptionDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    group: { type: String },
    events: { type: [String], required: true },
    channels: {
      type: [String],
      enum: ['email', 'outlook', 'push', 'in_app', 'webhook', 'teams'],
      default: ['in_app'],
    },
    quietHours: {
      start: { type: String },
      end: { type: String },
    },
    digest: {
      enabled: { type: Boolean, default: false },
      frequency: { type: String, enum: ['hourly', 'daily', 'weekly'], default: 'daily' },
    },
  },
  { timestamps: true },
);

notificationSubscriptionSchema.index({ tenantId: 1, userId: 1 });
notificationSubscriptionSchema.index({ tenantId: 1, group: 1 });

const NotificationSubscription: Model<NotificationSubscriptionDocument> = mongoose.model<NotificationSubscriptionDocument>(
  'NotificationSubscription',
  notificationSubscriptionSchema,
);

export default NotificationSubscription;
