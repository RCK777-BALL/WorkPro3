/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export type NotificationType = 'info' | 'warning' | 'critical';

export interface NotificationDocument extends Document {
  _id: Types.ObjectId;
  title: string;
  message: string;
  type: NotificationType;
  assetId?: Types.ObjectId;
  tenantId: Types.ObjectId;
  user?: Types.ObjectId;
  createdAt: Date;
  read: boolean;
}

const notificationSchema = new Schema<NotificationDocument>({
  title:   { type: String, required: true },
  message: { type: String, required: true },
  type:    { type: String, enum: ['info', 'warning', 'critical'], required: true },
  assetId: { type: Schema.Types.ObjectId, ref: 'Asset' },
  tenantId:{ type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
  user:    { type: Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  read:    { type: Boolean, default: false },
});

// keep your indexes
notificationSchema.index({ tenantId: 1 });
notificationSchema.index({ read: 1 });

const Notification: Model<NotificationDocument> =
  mongoose.model<NotificationDocument>('Notification', notificationSchema);

export default Notification;
 
