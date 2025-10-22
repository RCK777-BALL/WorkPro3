/*
 * SPDX-License-Identifier: MIT
 */

import { Schema, model, type Document, type Model, type Types } from 'mongoose';

export interface AuditLogDocument extends Document {
  tenantId: Types.ObjectId;
  siteId?: Types.ObjectId;
  userId?: Types.ObjectId;
  action: string;
  entityType: string;
  entityId?: Types.ObjectId;
  before?: unknown;
  after?: unknown;
  message?: string;
  ts?: Date;
  createdAt: Date;
}

const auditLogSchema = new Schema<AuditLogDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', index: true, required: true },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, required: true, index: true },
    entityType: { type: String, required: true, index: true },
    entityId: { type: Schema.Types.ObjectId },
    before: Schema.Types.Mixed,
    after: Schema.Types.Mixed,
    message: String,
    ts: { type: Date, default: Date.now },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

auditLogSchema.index({ tenantId: 1, createdAt: -1 });
auditLogSchema.index({ tenantId: 1, entityType: 1, entityId: 1 });

type AuditLogModel = Model<AuditLogDocument>;

const AuditLog: AuditLogModel = model<AuditLogDocument>('AuditLog', auditLogSchema);

export default AuditLog;
