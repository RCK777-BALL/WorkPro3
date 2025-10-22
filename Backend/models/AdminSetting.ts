/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, Document, Types } from 'mongoose';
import type { AdminSettingSection, AdminSettingStatus } from '@shared/admin';

export interface AdminSettingDocument extends Document {
  tenantId: Types.ObjectId;
  section: AdminSettingSection;
  config: Record<string, unknown>;
  status: AdminSettingStatus;
  updatedBy?: Types.ObjectId;
  updatedByName?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const adminSettingSchema = new Schema<AdminSettingDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    section: { type: String, required: true },
    config: { type: Schema.Types.Mixed, default: {} },
    status: { type: String, default: 'Pending' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedByName: { type: String },
    metadata: { type: Schema.Types.Mixed },
  },
  {
    collection: 'admin_settings',
    timestamps: true,
  },
);

adminSettingSchema.index({ tenantId: 1, section: 1 }, { unique: true });

const AdminSetting = mongoose.model<AdminSettingDocument>('AdminSetting', adminSettingSchema);

export default AdminSetting;

