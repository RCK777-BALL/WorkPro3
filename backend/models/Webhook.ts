/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface WebhookDocument extends Document {
  url: string;
  event: string;
  secret: string;
  createdAt: Date;
}

const webhookSchema = new Schema<WebhookDocument>({
  url: { type: String, required: true },
  event: { type: String, required: true },
  secret: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

webhookSchema.index({ event: 1 });

const Webhook: Model<WebhookDocument> = mongoose.model<WebhookDocument>('Webhook', webhookSchema);

export default Webhook;
