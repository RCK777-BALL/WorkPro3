/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface ChatMessageDocument extends Document {
  _id: Types.ObjectId;
  channelId: Types.ObjectId;
  sender: Types.ObjectId;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const chatMessageSchema = new Schema<ChatMessageDocument>(
  {
    channelId: { type: Schema.Types.ObjectId, ref: 'Channel', required: true },
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
  },
  { timestamps: true }
);

chatMessageSchema.index({ channelId: 1, createdAt: 1 });

const ChatMessage: Model<ChatMessageDocument> = mongoose.model<ChatMessageDocument>('ChatMessage', chatMessageSchema);

export default ChatMessage;
