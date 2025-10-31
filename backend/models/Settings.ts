/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface SettingsDocument extends Document {
  _id: Types.ObjectId;
  tenantId?: Types.ObjectId;
  userId?: Types.ObjectId;
  activePlant?: Types.ObjectId;
  defaultTheme: string;
  language: string;
}

const settingsSchema = new Schema<SettingsDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    activePlant: { type: Schema.Types.ObjectId, ref: 'Plant' },
    defaultTheme: { type: String, default: 'dark' },
    language: { type: String, default: 'en' },
  },
  { timestamps: true },
);

settingsSchema.index({ tenantId: 1, userId: 1 }, { unique: true, sparse: true });
settingsSchema.index(
  { tenantId: 1 },
  { unique: true, partialFilterExpression: { userId: { $exists: false } } },
);

export default mongoose.model<SettingsDocument>('Settings', settingsSchema);
