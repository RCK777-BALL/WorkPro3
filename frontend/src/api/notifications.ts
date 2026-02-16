import http from '@/lib/http';
import type { NotificationType } from '@/types';

export interface NotificationProviderStatus {
  id: 'twilio' | 'smtp' | 'outlook' | 'slack' | 'teams';
  label: string;
  configured: boolean;
  supportsTarget: boolean;
  docsUrl: string;
}

export interface NotificationTestInput {
  provider: NotificationProviderStatus['id'];
  to?: string;
  subject?: string;
  message: string;
  webhookUrl?: string;
}

export interface NotificationTestResult {
  provider: NotificationProviderStatus['id'];
  deliveredAt: string;
  target?: string;
}

export interface NotificationInboxResponse {
  items: NotificationType[];
  page: number;
  limit: number;
  total: number;
  unreadCount: number;
}

export interface NotificationSubscription {
  id: string;
  events: string[];
  channels: Array<'email' | 'outlook' | 'push' | 'in_app' | 'webhook' | 'teams'>;
  quietHours?: { start?: string; end?: string };
  digest?: { enabled?: boolean; frequency?: 'hourly' | 'daily' | 'weekly' };
}

export type NotificationSubscriptionInput = Omit<NotificationSubscription, 'id'>;

export const fetchNotifications = (params?: Record<string, unknown>) =>
  http.get<NotificationInboxResponse>('/notifications/inbox', { params }).then((res) => res.data);

export const markNotificationRead = (id: string) =>
  http.post<NotificationType>(`/notifications/${id}/read`).then((res) => res.data);

export const markAllNotificationsRead = () =>
  http.post<{ updated: number }>('/notifications/read-all').then((res) => res.data);

export const listNotificationProviders = () =>
  http
    .get<{ success?: boolean; data: NotificationProviderStatus[] }>('/integrations/notifications/providers')
    .then((res) => (Array.isArray(res.data) ? res.data : res.data.data));

export const sendNotificationTest = (payload: NotificationTestInput) =>
  http
    .post<{ success?: boolean; data: NotificationTestResult }>(
      '/integrations/notifications/test',
      payload,
    )
    .then((res) => (res.data as any).data ?? (res.data as any));

const normalizeSubscription = (item: any): NotificationSubscription => ({
  id: item?._id ?? item?.id ?? crypto.randomUUID(),
  events: item?.events ?? [],
  channels: item?.channels ?? [],
  quietHours: item?.quietHours ?? undefined,
  digest: item?.digest ?? undefined,
});

export const fetchNotificationSubscriptions = () =>
  http
    .get<{ success?: boolean; data: NotificationSubscription[] }>('/notifications/subscriptions')
    .then((res) => {
      const data = Array.isArray(res.data) ? res.data : (res.data as any).data;
      return Array.isArray(data) ? data.map(normalizeSubscription) : [];
    });

export const upsertNotificationSubscription = (payload: NotificationSubscriptionInput) =>
  http
    .put<{ success?: boolean; data: NotificationSubscription }>('/notifications/subscriptions', payload)
    .then((res) => normalizeSubscription((res.data as any).data ?? res.data));

export const deleteNotificationSubscription = (id: string) =>
  http.delete(`/notifications/subscriptions/${id}`).then((res) => res.data);
