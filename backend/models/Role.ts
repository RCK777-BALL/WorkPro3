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
}

const roleSchema = new Schema<RoleDocument>(
  {
    name: { type: String, required: true, unique: true },
    // Explicit array of permissions. Even though an empty array is a
    // sensible default, mark the field as required so that it is always
    // present on documents and in TypeScript typings.
    permissions: { type: [String], required: true, default: [] },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', index: true },
  },
  { timestamps: true }
);

roleSchema.index({ tenantId: 1, name: 1 }, { unique: true });

const Role: Model<RoleDocument> = mongoose.model<RoleDocument>('Role', roleSchema);
export default Role;
