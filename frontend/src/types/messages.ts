/*
 * SPDX-License-Identifier: MIT
 */

export interface ChatParticipant {
  id: string;
  name: string;
  email?: string;
}

export interface ChatAttachment {
  name: string;
  url: string;
  size: number;
  mimeType: string;
  uploadedBy?: string;
}

export interface ChatMessage {
  id: string;
  channelId: string;
  content: string;
  plainText: string;
  attachments: ChatAttachment[];
  readBy: string[];
  sender: ChatParticipant | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChatPreview {
  id: string;
  name: string;
  description?: string;
  isDirect: boolean;
  members: ChatParticipant[];
  unreadCount: number;
  lastMessage: ChatMessage | null;
  lastMessageAt?: string;
  pinned?: boolean;
}

export interface ChatUploadResponse {
  name: string;
  url: string;
  mimeType: string;
  size: number;
  uploadedBy?: string;
}
