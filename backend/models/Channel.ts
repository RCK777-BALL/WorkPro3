/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export type ChannelVisibility = 'public' | 'private' | 'department';

export interface ChannelDocument extends Document {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  topic?: string;
  isDirect: boolean;
  visibility: ChannelVisibility;
  members: Types.ObjectId[];
  allowedRoles: string[];
  department?: Types.ObjectId;
  createdBy: Types.ObjectId;
  tenantId: Types.ObjectId;
  lastMessageAt?: Date;
  avatarColor?: string;
  isArchived: boolean;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const channelSchema = new Schema<ChannelDocument>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String },
    topic: { type: String },
    isDirect: { type: Boolean, default: false },
    visibility: { type: String, enum: ['public', 'private', 'department'], default: 'private' },
    members: [{ type: Schema.Types.ObjectId, ref: 'User', index: true }],
    allowedRoles: { type: [String], default: [] },
    department: { type: Schema.Types.ObjectId, ref: 'Department' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    lastMessageAt: { type: Date },
    avatarColor: { type: String },
    isArchived: { type: Boolean, default: false },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

channelSchema.index({ tenantId: 1, isArchived: 1 });
channelSchema.index({ tenantId: 1, name: 1 });

const Channel: Model<ChannelDocument> = mongoose.model<ChannelDocument>('Channel', channelSchema);

export default Channel;
