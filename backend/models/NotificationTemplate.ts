/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';

export type NotificationChannel = 'email' | 'outlook' | 'push' | 'in_app' | 'webhook' | 'teams';

export interface NotificationTemplateDocument extends Document {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  event: string;
  channel: NotificationChannel;
  subject?: string;
  body: string;
  updatedAt: Date;
  createdAt: Date;
}

const notificationTemplateSchema = new Schema<NotificationTemplateDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    event: { type: String, required: true },
    channel: { type: String, enum: ['email', 'outlook', 'push', 'in_app', 'webhook', 'teams'], required: true },
    subject: { type: String },
    body: { type: String, required: true },
  },
  { timestamps: true },
);

notificationTemplateSchema.index({ tenantId: 1, event: 1, channel: 1 }, { unique: true });

const NotificationTemplate: Model<NotificationTemplateDocument> =
  mongoose.model<NotificationTemplateDocument>('NotificationTemplate', notificationTemplateSchema);

export default NotificationTemplate;
