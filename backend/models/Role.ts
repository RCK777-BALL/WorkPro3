/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface RoleDocument extends Document {
  name: string;
  /**
   * List of permission strings granted to the role. Each permission
   * follows the `resource:action` convention (e.g. `workorders:approve`).
   */
  permissions: string[];
  tenantId?: Types.ObjectId;
  siteId?: Types.ObjectId | null;
  departmentId?: Types.ObjectId | null;
  inheritsFrom?: string[];
}

const roleSchema = new Schema<RoleDocument>(
  {
    name: { type: String, required: true, unique: true },
    // Explicit array of permissions. Even though an empty array is a
    // sensible default, mark the field as required so that it is always
    // present on documents and in TypeScript typings.
    permissions: { type: [String], required: true, default: [] },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', index: true },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', index: true, default: null },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', index: true, default: null },
    inheritsFrom: { type: [String], default: void 0 },
  },
  { timestamps: true }
);

roleSchema.index({ tenantId: 1, siteId: 1, departmentId: 1, name: 1 }, { unique: true });
roleSchema.index({ tenantId: 1, siteId: 1, departmentId: 1 });

const Role: Model<RoleDocument> = mongoose.model<RoleDocument>('Role', roleSchema);
export default Role;
