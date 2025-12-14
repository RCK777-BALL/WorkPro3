/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';

export interface PermissionDelta {
  added: string[];
  removed: string[];
}

export interface PermissionChangeActor {
  id?: Types.ObjectId | null;
  email?: string | null;
  name?: string | null;
}

export interface PermissionChangeDocument extends Document {
  tenantId: Types.ObjectId;
  siteId?: Types.ObjectId | null;
  departmentId?: Types.ObjectId | null;
  roleId?: Types.ObjectId | null;
  roleName?: string | null;
  actor?: PermissionChangeActor | null;
  before?: string[] | null;
  after?: string[] | null;
  delta: PermissionDelta;
  changedAt: Date;
}

const actorSchema = new Schema<PermissionChangeActor>(
  {
    id: { type: Schema.Types.ObjectId, ref: 'User' },
    email: { type: String },
    name: { type: String },
  },
  { _id: false },
);

const deltaSchema = new Schema<PermissionDelta>(
  {
    added: { type: [String], default: [] },
    removed: { type: [String], default: [] },
  },
  { _id: false },
);

const permissionChangeSchema = new Schema<PermissionChangeDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', index: true, default: null },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', index: true, default: null },
    roleId: { type: Schema.Types.ObjectId, ref: 'Role', index: true },
    roleName: { type: String },
    actor: { type: actorSchema },
    before: { type: [String], default: void 0 },
    after: { type: [String], default: void 0 },
    delta: { type: deltaSchema, required: true },
    changedAt: { type: Date, required: true, default: () => new Date(), index: true },
  },
  { versionKey: false },
);

permissionChangeSchema.index({ tenantId: 1, roleId: 1, changedAt: -1 });

const PermissionChangeLog: Model<PermissionChangeDocument> =
  (mongoose.models.PermissionChangeLog as Model<PermissionChangeDocument>) ||
  mongoose.model<PermissionChangeDocument>('PermissionChangeLog', permissionChangeSchema);

export default PermissionChangeLog;
