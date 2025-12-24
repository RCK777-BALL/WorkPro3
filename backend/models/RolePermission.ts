/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';

export interface RolePermissionDocument extends Document {
  roleId: Types.ObjectId;
  permissionId: Types.ObjectId;
  tenantId: Types.ObjectId;
  siteId?: Types.ObjectId | null;
  departmentId?: Types.ObjectId | null;
}

const rolePermissionSchema = new Schema<RolePermissionDocument>(
  {
    roleId: { type: Schema.Types.ObjectId, ref: 'Role', required: true, index: true },
    permissionId: { type: Schema.Types.ObjectId, ref: 'Permission', required: true, index: true },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', index: true, default: null },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', index: true, default: null },
  },
  { timestamps: true },
);

rolePermissionSchema.index(
  { roleId: 1, permissionId: 1, tenantId: 1, siteId: 1, departmentId: 1 },
  { unique: true },
);

const RolePermission: Model<RolePermissionDocument> =
  (mongoose.models.RolePermission as Model<RolePermissionDocument>) ||
  mongoose.model<RolePermissionDocument>('RolePermission', rolePermissionSchema);

export default RolePermission;
