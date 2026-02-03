/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, type Document, type Model } from 'mongoose';

export interface IdempotencyKeyDocument extends Document {
  key: string;
  tenantId?: string;
  requestHash: string;
  method?: string;
  path?: string;
  statusCode?: number;
  responseBody?: unknown;
  createdAt: Date;
  expiresAt: Date;
}

const idempotencySchema = new Schema<IdempotencyKeyDocument>(
  {
    key: { type: String, required: true, index: true },
    tenantId: { type: String, index: true },
    requestHash: { type: String, required: true },
    method: { type: String },
    path: { type: String },
    statusCode: { type: Number },
    responseBody: { type: Schema.Types.Mixed },
    createdAt: { type: Date, default: () => new Date() },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  { timestamps: false }
);

idempotencySchema.index({ key: 1, tenantId: 1 }, { unique: true });

const IdempotencyKey: Model<IdempotencyKeyDocument> =
  mongoose.models.IdempotencyKey ||
  mongoose.model<IdempotencyKeyDocument>('IdempotencyKey', idempotencySchema);

export default IdempotencyKey;
