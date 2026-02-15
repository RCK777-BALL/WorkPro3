/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export type NotificationType = 'info' | 'warning' | 'critical';

export type NotificationCategory =
  | 'assigned'
  | 'updated'
  | 'overdue'
  | 'pm_due'
  | 'comment'
  | 'request_submitted';

export type NotificationDeliveryState = 'pending' | 'queued' | 'sent' | 'failed' | 'delivered';

export interface NotificationDocument extends Document {
  _id: Types.ObjectId;
  title: string;
  message: string;
  type: NotificationType;
  category: NotificationCategory;
  assetId?: Types.ObjectId;
  tenantId: Types.ObjectId;
  user?: Types.ObjectId;
  workOrderId?: Types.ObjectId;
  inventoryItemId?: Types.ObjectId;
  pmTaskId?: Types.ObjectId;
  deliveryState: NotificationDeliveryState;
  createdAt: Date;
  read: boolean;
}

const notificationSchema = new Schema<NotificationDocument>({
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['info', 'warning', 'critical'], required: true, default: 'info' },
  category: {
    type: String,
    enum: ['assigned', 'updated', 'overdue', 'pm_due', 'comment', 'request_submitted'],
    required: true,
    default: 'updated',
  },
  assetId: { type: Schema.Types.ObjectId, ref: 'Asset' },
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  workOrderId: { type: Schema.Types.ObjectId, ref: 'WorkOrder' },
  inventoryItemId: { type: Schema.Types.ObjectId, ref: 'InventoryItem' },
  pmTaskId: { type: Schema.Types.ObjectId, ref: 'PMTask' },
  deliveryState: {
    type: String,
    enum: ['pending', 'queued', 'sent', 'failed', 'delivered'],
    default: 'pending',
  },
  createdAt: { type: Date, default: Date.now },
  read: { type: Boolean, default: false },
});

notificationSchema.index({ tenantId: 1 });
notificationSchema.index({ read: 1 });
notificationSchema.index({ workOrderId: 1 });
notificationSchema.index({ inventoryItemId: 1 });
notificationSchema.index({ pmTaskId: 1 });
notificationSchema.index({ user: 1 });

const Notification: Model<NotificationDocument> = mongoose.model<NotificationDocument>(
  'Notification',
  notificationSchema
);

export default Notification;
