/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';

export interface UserRoleAssignmentDocument extends Document {
  userId: Types.ObjectId;
  roleId: Types.ObjectId;
  tenantId: Types.ObjectId;
  siteId?: Types.ObjectId | null | undefined;
  departmentId?: Types.ObjectId | null | undefined;
}

const userRoleAssignmentSchema = new Schema<UserRoleAssignmentDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    roleId: { type: Schema.Types.ObjectId, ref: 'Role', required: true, index: true },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', index: true, default: null },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', index: true, default: null },
  },
  { timestamps: true },
);

userRoleAssignmentSchema.index(
  { userId: 1, roleId: 1, tenantId: 1, siteId: 1, departmentId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      userId: { $exists: true },
      roleId: { $exists: true },
      tenantId: { $exists: true },
    },
  },
);

const UserRoleAssignment: Model<UserRoleAssignmentDocument> =
  mongoose.model<UserRoleAssignmentDocument>('UserRoleAssignment', userRoleAssignmentSchema);

export default UserRoleAssignment;
