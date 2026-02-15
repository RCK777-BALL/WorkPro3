/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface AuditEventDocument extends Document {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  siteId?: Types.ObjectId;
  userId?: Types.ObjectId;
  action: string;
  details?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const auditEventSchema = new Schema<AuditEventDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    siteId: { type: Schema.Types.ObjectId, index: true },
    userId: { type: Schema.Types.ObjectId },
    action: { type: String, required: true },
    details: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

// Prevent any updates after initial save
auditEventSchema.pre('save', function () {
  if (!this.isNew) {
    throw new Error('AuditEvent is immutable');
  }
});

(['updateOne', 'findOneAndUpdate', 'deleteOne', 'deleteMany', 'findOneAndDelete', 'remove'] as const).forEach((hook) => {
  (auditEventSchema.pre as any)(hook, function () {
    throw new Error('AuditEvent is immutable');
  });
});

const AuditEvent: Model<AuditEventDocument> = mongoose.model<AuditEventDocument>('AuditEvent', auditEventSchema);
export default AuditEvent;
