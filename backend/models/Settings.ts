/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface SettingsDoc extends Document {
  _id: Types.ObjectId;
  tenantId?: Types.ObjectId | undefined;
  activePlant?: Types.ObjectId | undefined;
  defaultTheme: string;
  language: string;
  timezone?: string | undefined;
  unitSystem?: 'metric' | 'imperial' | undefined;
  locale?: string | undefined;
}

const settingsSchema = new Schema<SettingsDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', index: true },
    activePlant: { type: Schema.Types.ObjectId, ref: 'Plant' },
    defaultTheme: { type: String, default: 'dark' },
    language: { type: String, default: 'en' },
    timezone: { type: String, default: 'UTC' },
    unitSystem: { type: String, enum: ['metric', 'imperial'], default: 'metric' },
    locale: { type: String, default: 'en-US' },
  },
  { timestamps: true },
);

export default mongoose.model<SettingsDoc>('Settings', settingsSchema);
