/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, type Document, type Model, Types } from 'mongoose';

export interface NotificationPreferenceDocument extends Document {
  tenantId: Types.ObjectId;
  userId: Types.ObjectId;
  channels: {
    email?: boolean;
    outlook?: boolean;
    sms?: boolean;
    push?: boolean;
    teams?: boolean;
  };
  outlookEmail?: string;
  teamsWebhookUrl?: string;
  muted?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationPreferenceSchema = new Schema<NotificationPreferenceDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    channels: {
      email: { type: Boolean, default: true },
      outlook: { type: Boolean, default: false },
      sms: { type: Boolean, default: false },
      push: { type: Boolean, default: false },
      teams: { type: Boolean, default: false },
    },
    outlookEmail: { type: String },
    teamsWebhookUrl: { type: String },
    muted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

notificationPreferenceSchema.index({ tenantId: 1, userId: 1 }, { unique: true });

const NotificationPreference: Model<NotificationPreferenceDocument> = mongoose.model<NotificationPreferenceDocument>(
  'NotificationPreference',
  notificationPreferenceSchema,
);

export default NotificationPreference;
