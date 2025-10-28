/*
 * SPDX-License-Identifier: MIT
 */

import http from '@/lib/http';
import type { ChatMessage, ChatPreview, ChatUploadResponse } from '@/types/messages';

export const fetchChannelPreviews = () =>
  http.get<ChatPreview[]>('/chat/channels').then((res) => res.data);

export const fetchDirectPreviews = () =>
  http.get<ChatPreview[]>('/chat/direct').then((res) => res.data);

export const fetchChannelMessages = (channelId: string, query?: { q?: string; before?: string; limit?: number }) =>
  http
    .get<ChatMessage[]>(`/chat/channels/${channelId}/messages`, { params: query })
    .then((res) => res.data);

export const fetchDirectMessages = (
  conversationId: string,
  query?: { q?: string; before?: string; limit?: number },
) =>
  http
    .get<ChatMessage[]>(`/chat/direct/${conversationId}/messages`, { params: query })
    .then((res) => res.data);

interface SendMessagePayload {
  content?: string;
  attachments?: ChatUploadResponse[];
}

export const sendChannelMessage = (channelId: string, payload: SendMessagePayload) =>
  http
    .post<ChatMessage>(`/chat/channels/${channelId}/messages`, payload)
    .then((res) => res.data);

export const sendDirectMessage = (conversationId: string, payload: SendMessagePayload) =>
  http
    .post<ChatMessage>(`/chat/direct/${conversationId}/messages`, payload)
    .then((res) => res.data);

export const markChannelRead = (channelId: string) =>
  http.post<{ updated: number }>(`/chat/channels/${channelId}/read`).then((res) => res.data);

export const markDirectRead = (conversationId: string) =>
  http.post<{ updated: number }>(`/chat/direct/${conversationId}/read`).then((res) => res.data);

export const uploadChatFile = (file: File) => {
  const data = new FormData();
  data.append('file', file);
  return http
    .post<ChatUploadResponse>('/chat/upload', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((res) => res.data);
};
