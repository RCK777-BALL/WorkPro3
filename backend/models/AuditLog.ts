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
  entityId: Types.ObjectId;
  before?: unknown;
  after?: unknown;
  ts: Date;
}

const auditLogSchema = new Schema<AuditLogDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site' },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: { type: Schema.Types.ObjectId, required: true },
    before: Schema.Types.Mixed,
    after: Schema.Types.Mixed,
    ts: { type: Date, default: Date.now },
  },
  { timestamps: false },
);

const AuditLog: Model<AuditLogDocument> = mongoose.model<AuditLogDocument>('AuditLog', auditLogSchema);

export default AuditLog;
