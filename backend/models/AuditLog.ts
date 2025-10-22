/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';

export interface AuditLogDocument extends Document {
  tenantId: Types.ObjectId;
  siteId?: Types.ObjectId | null;
  userId?: Types.ObjectId | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  ts: Date;
}

const auditLogSchema = new Schema<AuditLogDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site' },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: { type: String },
    before: { type: Schema.Types.Mixed },
    after: { type: Schema.Types.Mixed },
    ts: { type: Date, required: true, default: () => new Date(), index: true },
  },
  {
    versionKey: false,
  },
);

auditLogSchema.index({ tenantId: 1, ts: -1 });

type AuditLogModel = Model<AuditLogDocument>;

const AuditLog: AuditLogModel =
  (mongoose.models.AuditLog as AuditLogModel) || mongoose.model<AuditLogDocument>('AuditLog', auditLogSchema);

export default AuditLog;
