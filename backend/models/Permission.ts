/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';

export interface PermissionDocument extends Document {
  key: string;
  label?: string;
  description?: string;
  category?: string;
  tenantId?: Types.ObjectId;
  isSystem?: boolean;
}

const permissionSchema = new Schema<PermissionDocument>(
  {
    key: { type: String, required: true },
    label: { type: String },
    description: { type: String },
    category: { type: String },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', index: true },
    isSystem: { type: Boolean, default: false },
  },
  { timestamps: true },
);

permissionSchema.index({ tenantId: 1, key: 1 }, { unique: true });

const Permission: Model<PermissionDocument> =
  (mongoose.models.Permission as Model<PermissionDocument>) ||
  mongoose.model<PermissionDocument>('Permission', permissionSchema);

export default Permission;
