/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '@/components/common/Button';
import http from '@/lib/http';
import type { NotificationType } from '@/types';

type Notification = NotificationType & { assetId?: string };

const Notifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const limit = 10;

  const fetchNotifications = async (pageNum: number) => {
    try {
      setLoading(true);
      const res = await http.get('/notifications', { params: { page: pageNum, limit } });
      const data = Array.isArray(res.data) ? res.data : res.data.items || [];
      type ApiNotification = Partial<Notification> & {
        _id?: string;
        created_at?: string;
      };
      const mapped: Notification[] = data.map((n: ApiNotification) => ({
        id: n._id || n.id || '',
        title: n.title || '',
        message: n.message || '',
        type: n.type || 'info',
        createdAt: n.createdAt || n.created_at || '',
        read: n.read ?? false,
        assetId: n.assetId,
      }));
      setNotifications(prev => pageNum === 1 ? mapped : [...prev, ...mapped]);
      setHasMore(data.length === limit);
    } catch (err) {
      console.error('Failed to load notifications', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications(page);
  }, [page]);

  const markAsRead = async (id: string) => {
    try {
      await http.put(`/notifications/${id}`, { read: true });
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const dismiss = async (id: string) => {
    try {
      await http.delete(`/notifications/${id}`);
    } catch (err) {
      console.error('Failed to delete notification', err);
    }
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
          <div className="space-y-4">
        {notifications.map(n => (
          <div
            key={n.id}
            className={`p-4 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg`}
          >
            <div className="flex justify-between items-start">
              <p className={n.read ? 'text-neutral-500' : 'font-medium'}>{n.message}</p>
              <span className="text-xs text-neutral-500">{formatTime(n.createdAt)}</span>
            </div>
            {n.assetId && (
              <Link to={`/assets/${n.assetId}`} className="text-sm text-primary-600 hover:underline">
                View Asset
              </Link>
            )}
            <div className="mt-2 space-x-2">
              {!n.read && (
                <Button size="sm" variant="outline" onClick={() => markAsRead(n.id)}>
                  Mark as Read
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => dismiss(n.id)}>
                Dismiss
              </Button>
            </div>
          </div>
        ))}

        {notifications.length === 0 && !loading && (
          <p className="text-center text-neutral-500">No notifications</p>
        )}

        {hasMore && (
          <div className="flex justify-center">
            <Button variant="outline" onClick={() => setPage(p => p + 1)} disabled={loading}>
              {loading ? 'Loading...' : 'Load More'}
            </Button>
          </div>
        )}
      </div>
  );
};

export default Notifications;

