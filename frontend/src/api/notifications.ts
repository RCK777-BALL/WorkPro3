import api from '../lib/api';
import type { NotificationType } from '../types';

export const fetchNotifications = (params?: Record<string, unknown>) =>
  api.get<NotificationType[]>('/notifications', { params }).then((res) => res.data);

export const markNotificationRead = (id: string) =>
  api.patch<NotificationType>(`/notifications/${id}/read`).then((res) => res.data);

