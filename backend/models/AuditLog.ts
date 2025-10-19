/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, Document, Types } from 'mongoose';

export interface AuditLogDocument extends Document {
  tenantId: Types.ObjectId;
  userId?: Types.ObjectId;
  action: string;
  entityType: string;
  entityId: Types.ObjectId | string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  module?: string;
  details?: Record<string, unknown> | null;
  ts: Date;
}

const auditLogSchema = new Schema<AuditLogDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    userId: { type: Schema.Types.ObjectId },
    action: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: { type: Schema.Types.Mixed, required: true },
    before: { type: Schema.Types.Mixed },
    after: { type: Schema.Types.Mixed },
    module: { type: String },
    details: { type: Schema.Types.Mixed },
    ts: { type: Date, default: Date.now },
  },
  { collection: 'audit_logs' }
);

const AuditLog = mongoose.model<AuditLogDocument>('AuditLog', auditLogSchema);
export default AuditLog;
