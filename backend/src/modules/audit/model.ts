/*
 * SPDX-License-Identifier: MIT
 */

import { Schema, Types, model, type Document } from 'mongoose';

export interface AuditEntryDocument extends Document {
  tenantId: Types.ObjectId;
  module: string;
  action: string;
  entityType: string;
  entityId?: Types.ObjectId;
  actorId?: Types.ObjectId;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}

const auditEntrySchema = new Schema<AuditEntryDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    module: { type: String, required: true, trim: true },
    action: { type: String, required: true, trim: true },
    entityType: { type: String, required: true, trim: true },
    entityId: { type: Schema.Types.ObjectId },
    actorId: { type: Schema.Types.ObjectId, ref: 'User' },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

auditEntrySchema.index({ tenantId: 1, module: 1, action: 1, createdAt: -1 });

auditEntrySchema.index({ tenantId: 1, entityType: 1, entityId: 1, createdAt: -1 });

export default model<AuditEntryDocument>('AuditEntry', auditEntrySchema);
