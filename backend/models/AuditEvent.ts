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
auditEventSchema.pre('save', function (next) {
  if (!this.isNew) {
    next(new Error('AuditEvent is immutable'));
  } else {
    next();
  }
});

const reject = (next: (err?: Error) => void) => {
  next(new Error('AuditEvent is immutable'));
};

['updateOne', 'findOneAndUpdate', 'deleteOne', 'deleteMany', 'findOneAndDelete', 'remove'].forEach((hook) => {
  auditEventSchema.pre(hook as any, function (next) {
    reject(next);
  });
});

const AuditEvent: Model<AuditEventDocument> = mongoose.model<AuditEventDocument>('AuditEvent', auditEventSchema);
export default AuditEvent;
