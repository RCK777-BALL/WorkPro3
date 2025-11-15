/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, type Model, type Types } from 'mongoose';

export type MobileOfflineActionStatus = 'pending' | 'processed';

export interface MobileOfflineAction {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  userId: Types.ObjectId;
  type: string;
  payload: Record<string, unknown>;
  status: MobileOfflineActionStatus;
  processedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const MobileOfflineActionSchema = new Schema<MobileOfflineAction>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, required: true, trim: true },
    payload: { type: Schema.Types.Mixed, default: {} },
    status: {
      type: String,
      enum: ['pending', 'processed'],
      default: 'pending',
      index: true,
    },
    processedAt: { type: Date },
  },
  { timestamps: true },
);

MobileOfflineActionSchema.index({ tenantId: 1, userId: 1, createdAt: -1 });
MobileOfflineActionSchema.index({ tenantId: 1, status: 1 });

const MobileOfflineActionModel: Model<MobileOfflineAction> = mongoose.model<MobileOfflineAction>(
  'MobileOfflineAction',
  MobileOfflineActionSchema,
);

export default MobileOfflineActionModel;
