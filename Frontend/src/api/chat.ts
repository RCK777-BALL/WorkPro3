/*
 * SPDX-License-Identifier: MIT
 */

import { api } from '@/lib/api';

export interface ChatMember {
  id: string;
  name: string;
  email?: string;
  roles: string[];
}

export interface ChatAttachment {
  id?: string;
  name: string;
  size: number;
  mimeType: string;
  url: string;
  uploadedBy?: string;
}

export interface ChatReaction {
  emoji: string;
  users: string[];
  createdAt?: string | Date;
}

export interface ChatMessage {
  id: string;
  channelId: string;
  tenantId: string;
  sender: string;
  content: string;
  plainText: string;
  attachments: ChatAttachment[];
  mentions: string[];
  reactions: ChatReaction[];
  threadRoot?: string;
  readBy: string[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ChatChannel {
  id: string;
  name: string;
  description?: string;
  topic?: string;
  isDirect: boolean;
  visibility: 'public' | 'private' | 'department';
  members: ChatMember[];
  allowedRoles: string[];
  department?: string;
  lastMessageAt?: string;
  unreadCount: number;
  lastMessage?: {
    id: string;
    sender: string;
    content: string;
    plainText: string;
    createdAt: string;
    attachments: ChatAttachment[];
    threadRoot?: string;
  } | null;
  metadata?: Record<string, unknown>;
}

export interface MessageListResponse {
  items: ChatMessage[];
  hasMore: boolean;
}

export interface SendMessagePayload {
  channelId: string;
  content: string;
  plainText?: string;
  attachments?: ChatAttachment[];
  mentions?: string[];
  metadata?: Record<string, unknown>;
  threadRoot?: string;
}

export const chatApi = {
  async listChannels(): Promise<ChatChannel[]> {
    const { data } = await api.get<ChatChannel[]>('/chat/channels');
    return data;
  },
  async getChannel(channelId: string): Promise<ChatChannel> {
    const { data } = await api.get<ChatChannel>(`/chat/channels/${channelId}`);
    return data;
  },
  async listMessages(params: { channelId: string; threadRoot?: string; before?: string; limit?: number }): Promise<MessageListResponse> {
    const { data } = await api.get<MessageListResponse>('/chat/messages', { params });
    return data;
  },
  async sendMessage(payload: SendMessagePayload): Promise<ChatMessage> {
    const { data } = await api.post<ChatMessage>('/chat/messages', payload);
    return data;
  },
  async react(messageId: string, emoji: string): Promise<ChatMessage> {
    const { data } = await api.post<ChatMessage>(`/chat/messages/${messageId}/reactions`, { emoji });
    return data;
  },
  async removeReaction(messageId: string, emoji: string): Promise<ChatMessage> {
    const { data } = await api.delete<ChatMessage>(`/chat/messages/${messageId}/reactions`, { data: { emoji } });
    return data;
  },
  async markRead(messageId: string): Promise<ChatMessage> {
    const { data } = await api.post<ChatMessage>(`/chat/messages/${messageId}/read`);
    return data;
  },
  async upload(files: File[]): Promise<ChatAttachment[]> {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    const { data } = await api.post<ChatAttachment[]>('/chat/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
};

export default chatApi;
