/*
 * SPDX-License-Identifier: MIT
 */

import { Schema, model, type Document, type Model, Types } from 'mongoose';

export type CommentEntityType = 'WO' | 'Asset';

export interface CommentDocument extends Document {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  entityType: CommentEntityType;
  entityId: Types.ObjectId;
  authorId: Types.ObjectId;
  body: string;
  mentions: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new Schema<CommentDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    entityType: { type: String, enum: ['WO', 'Asset'], required: true, index: true },
    entityId: { type: Schema.Types.ObjectId, required: true, index: true },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    body: { type: String, required: true },
    mentions: { type: [Schema.Types.ObjectId], ref: 'User', default: [] },
  },
  { timestamps: true }
);

commentSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });

const Comment: Model<CommentDocument> = model<CommentDocument>('Comment', commentSchema);

export default Comment;
