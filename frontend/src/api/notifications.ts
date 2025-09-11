 import http from '@/lib/http';
import type { NotificationType } from '@/types';
 

export const fetchNotifications = (params?: Record<string, unknown>) =>
  http.get<NotificationType[]>('/notifications', { params }).then((res) => res.data);

export const markNotificationRead = (id: string) =>
  http.patch<NotificationType>(`/notifications/${id}/read`).then((res) => res.data);

