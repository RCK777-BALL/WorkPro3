/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';

export interface AuditLogEntityRef {
  type: string;
  id?: string | null;
  label?: string | null;
}

export interface AuditLogActor {
  id?: Types.ObjectId | null;
  name?: string | null;
  email?: string | null;
}

export interface AuditLogDiffEntry {
  path: string;
  before?: unknown;
  after?: unknown;
}

export interface AuditLogDocument extends Document {
  tenantId: Types.ObjectId;
  siteId?: Types.ObjectId | null;
  userId?: Types.ObjectId | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  entity: AuditLogEntityRef;
  actor?: AuditLogActor | null;
  before?: unknown;
  after?: unknown;
  diff?: AuditLogDiffEntry[] | null;
  ts: Date;
  expiresAt?: Date;
}

const actorSchema = new Schema<AuditLogActor>(
  {
    id: { type: Schema.Types.ObjectId, ref: 'User' },
    name: { type: String },
    email: { type: String },
  },
  { _id: false },
);

const entitySchema = new Schema<AuditLogEntityRef>(
  {
    type: { type: String, required: true },
    id: { type: String },
    label: { type: String },
  },
  { _id: false },
);

const diffSchema = new Schema<AuditLogDiffEntry>(
  {
    path: { type: String, required: true },
    before: { type: Schema.Types.Mixed },
    after: { type: Schema.Types.Mixed },
  },
  { _id: false },
);

const auditLogSchema = new Schema<AuditLogDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site' },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: { type: String },
    entity: { type: entitySchema, required: true },
    actor: { type: actorSchema },
    before: { type: Schema.Types.Mixed },
    after: { type: Schema.Types.Mixed },
    diff: { type: [diffSchema], default: void 0 },
    ts: { type: Date, required: true, default: () => new Date(), index: true },
    expiresAt: { type: Date },
  },
  {
    versionKey: false,
  },
);

auditLogSchema.index({ tenantId: 1, ts: -1 });
auditLogSchema.index({ tenantId: 1, 'entity.type': 1, ts: -1 });
auditLogSchema.index({ tenantId: 1, action: 1, ts: -1 });
auditLogSchema.index({ tenantId: 1, 'actor.email': 1 });
auditLogSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

type AuditLogModel = Model<AuditLogDocument>;

const AuditLog: AuditLogModel =
  (mongoose.models.AuditLog as AuditLogModel) || mongoose.model<AuditLogDocument>('AuditLog', auditLogSchema);

export default AuditLog;
