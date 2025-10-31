/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface SettingsDoc extends Document {
  _id: Types.ObjectId;
  tenantId?: Types.ObjectId;
  activePlant?: Types.ObjectId;
  defaultTheme: string;
  language: string;
}

const settingsSchema = new Schema<SettingsDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', index: true },
    activePlant: { type: Schema.Types.ObjectId, ref: 'Plant' },
    defaultTheme: { type: String, default: 'dark' },
    language: { type: String, default: 'en' },
  },
  { timestamps: true },
);

export default mongoose.model<SettingsDoc>('Settings', settingsSchema);
