/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export type WebhookDeliveryStatus = 'pending' | 'retrying' | 'delivered' | 'failed';

export interface WebhookDeliveryLogDocument extends Document {
  subscriptionId: mongoose.Types.ObjectId;
  event: string;
  payload: Record<string, unknown>;
  attempt: number;
  status: WebhookDeliveryStatus;
  responseStatus?: number;
  error?: string;
  nextAttemptAt?: Date;
  deliveredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const webhookDeliveryLogSchema = new Schema<WebhookDeliveryLogDocument>(
  {
    subscriptionId: { type: Schema.Types.ObjectId, ref: 'WebhookSubscription', required: true, index: true },
    event: { type: String, required: true },
    payload: { type: Schema.Types.Mixed, required: true },
    attempt: { type: Number, default: 0 },
    status: { type: String, enum: ['pending', 'retrying', 'delivered', 'failed'], default: 'pending' },
    responseStatus: { type: Number },
    error: { type: String },
    nextAttemptAt: { type: Date },
    deliveredAt: { type: Date },
  },
  { timestamps: true },
);

webhookDeliveryLogSchema.index({ status: 1, nextAttemptAt: 1 });

const WebhookDeliveryLog: Model<WebhookDeliveryLogDocument> = mongoose.model<WebhookDeliveryLogDocument>(
  'WebhookDeliveryLog',
  webhookDeliveryLogSchema,
);

export default WebhookDeliveryLog;
