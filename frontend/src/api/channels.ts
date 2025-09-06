import api from '../lib/api';
import type { Channel, Member, Message } from '../types';

export const getChannelMembers = (channelId: string) =>
  api.get<Member[]>(`/channels/${channelId}/members`).then((res) => res.data);

export const addMembers = (channelId: string, members: string[]) =>
  api
    .post<Channel>(`/channels/${channelId}/members`, { members })
    .then((res) => res.data);

export const removeMember = (channelId: string, memberId: string) =>
  api
    .delete<Channel>(`/channels/${channelId}/members/${memberId}`)
    .then((res) => res.data);

export const togglePin = (id: string) =>
  api.post<Channel>(`/channels/${id}/pin`).then((res) => res.data);

export const toggleMute = (id: string) =>
  api.post<Channel>(`/channels/${id}/mute`).then((res) => res.data);

export const searchMessages = (channelId: string, q: string) =>
  api
    .get<Message[]>(`/channels/${channelId}/messages/search`, { params: { q } })
    .then((res) => res.data);

