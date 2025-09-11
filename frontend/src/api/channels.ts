import http from '@/lib/http';
import type { Channel, Member, Message } from '@/types';

export const getChannelMembers = (channelId: string) =>
  http.get<Member[]>(`/channels/${channelId}/members`).then((res) => res.data);

export const addMembers = (channelId: string, members: string[]) =>
  http
    .post<Channel>(`/channels/${channelId}/members`, { members })
    .then((res) => res.data);

export const removeMember = (channelId: string, memberId: string) =>
  http
    .delete<Channel>(`/channels/${channelId}/members/${memberId}`)
    .then((res) => res.data);

export const togglePin = (id: string) =>
  http.post<Channel>(`/channels/${id}/pin`).then((res) => res.data);

export const toggleMute = (id: string) =>
  http.post<Channel>(`/channels/${id}/mute`).then((res) => res.data);

export const searchMessages = (channelId: string, q: string) =>
  http
    .get<Message[]>(`/channels/${channelId}/messages/search`, { params: { q } })
    .then((res) => res.data);

