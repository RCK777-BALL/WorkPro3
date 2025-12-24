/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface WebhookSubscriptionDocument extends Document {
  name: string;
  url: string;
  events: string[];
  secret: string;
  active: boolean;
  maxAttempts: number;
  tenantId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const webhookSubscriptionSchema = new Schema<WebhookSubscriptionDocument>(
  {
    name: { type: String, required: true },
    url: { type: String, required: true },
    events: { type: [String], default: [], required: true },
    secret: { type: String, required: true },
    active: { type: Boolean, default: true },
    maxAttempts: { type: Number, default: 3 },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  },
  { timestamps: true },
);

webhookSubscriptionSchema.index({ tenantId: 1, url: 1 });
webhookSubscriptionSchema.index({ events: 1 });

const WebhookSubscription: Model<WebhookSubscriptionDocument> = mongoose.model<WebhookSubscriptionDocument>(
  'WebhookSubscription',
  webhookSubscriptionSchema,
);

export default WebhookSubscription;
