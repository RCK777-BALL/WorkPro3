/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface ChatAttachment {
  _id: Types.ObjectId;
  name: string;
  size: number;
  mimeType: string;
  url: string;
  uploadedBy: Types.ObjectId;
}

export interface ChatReaction {
  emoji: string;
  users: Types.ObjectId[];
  createdAt: Date;
}

export interface ChatMessageDocument extends Document {
  _id: Types.ObjectId;
  channelId: Types.ObjectId;
  tenantId: Types.ObjectId;
  sender: Types.ObjectId;
  content: string;
  plainText: string;
  attachments: ChatAttachment[];
  mentions: Types.ObjectId[];
  reactions: ChatReaction[];
  threadRoot?: Types.ObjectId;
  readBy: Types.ObjectId[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const attachmentSchema = new Schema<ChatAttachment>(
  {
    name: { type: String, required: true },
    size: { type: Number, required: true },
    mimeType: { type: String, required: true },
    url: { type: String, required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { _id: true }
);

const reactionSchema = new Schema<ChatReaction>(
  {
    emoji: { type: String, required: true },
    users: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    createdAt: { type: Date, default: () => new Date() },
  },
  { _id: false }
);

const chatMessageSchema = new Schema<ChatMessageDocument>(
  {
    channelId: { type: Schema.Types.ObjectId, ref: 'Channel', required: true, index: true },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    content: { type: String, required: true },
    plainText: { type: String, default: '' },
    attachments: { type: [attachmentSchema], default: [] },
    mentions: { type: [Schema.Types.ObjectId], ref: 'User', default: [] },
    reactions: { type: [reactionSchema], default: [] },
    threadRoot: { type: Schema.Types.ObjectId, ref: 'ChatMessage', index: true },
    readBy: { type: [Schema.Types.ObjectId], ref: 'User', default: [] },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

chatMessageSchema.index({ channelId: 1, createdAt: 1 });
chatMessageSchema.index({ tenantId: 1, createdAt: -1 });
chatMessageSchema.index({ plainText: 'text', content: 'text' });

const ChatMessage: Model<ChatMessageDocument> = mongoose.model<ChatMessageDocument>('ChatMessage', chatMessageSchema);

export default ChatMessage;
