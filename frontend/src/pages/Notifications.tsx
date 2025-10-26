/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import http from '@/lib/http';
import { useSettingsStore } from '@/store/settingsStore';
import type { NotificationSettings } from '@/store/settingsStore';
import type { NotificationType } from '@/types';

type Notification = NotificationType & { assetId?: string };

const Notifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const limit = 10;
  const notificationSettings = useSettingsStore((state) => state.notifications);
  const setNotificationSettings = useSettingsStore((state) => state.setNotifications);

  type ToggleKey = {
    [K in keyof NotificationSettings]: NotificationSettings[K] extends boolean ? K : never;
  }[keyof NotificationSettings & string];

  const toggleOptions = useMemo(
    () =>
      [
        {
          key: 'emailNotifications',
          label: 'Email notifications',
          description: 'Receive important updates in your inbox',
        },
        {
          key: 'pushNotifications',
          label: 'Push notifications',
          description: 'Stay up to date with browser alerts',
        },
        {
          key: 'workOrderUpdates',
          label: 'Work order updates',
          description: 'Alert me when work orders are created or updated',
        },
        {
          key: 'maintenanceReminders',
          label: 'Maintenance reminders',
          description: 'Remind me ahead of scheduled maintenance tasks',
        },
        {
          key: 'inventoryAlerts',
          label: 'Inventory alerts',
          description: 'Notify when critical stock thresholds are reached',
        },
        {
          key: 'systemUpdates',
          label: 'System updates',
          description: 'Announcements about new features and releases',
        },
      ] satisfies { key: ToggleKey; label: string; description: string }[],
    []
  );

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
      setNotifications((prev) => (pageNum === 1 ? mapped : [...prev, ...mapped]));
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
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const dismiss = async (id: string) => {
    try {
      await http.delete(`/notifications/${id}`);
    } catch (err) {
      console.error('Failed to delete notification', err);
    }
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <div className="space-y-6">
      <Card title="Notification Preferences" subtitle="Choose how WorkPro keeps you informed">
        <div className="space-y-4">
          {toggleOptions.map(({ key, label, description }) => (
            <div className="flex items-center justify-between" key={key}>
              <div>
                <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">{label}</p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">{description}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={notificationSettings[key]}
                  onChange={(event) =>
                    setNotificationSettings({
                      [key]: event.target.checked,
                    } as Partial<NotificationSettings>)
                  }
                />
                <div className="w-11 h-6 bg-neutral-200 dark:bg-neutral-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600" />
              </label>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Notification Feed">
        <div className="space-y-4">
          {notifications.map((n) => (
            <div
              key={n.id}
              className="p-4 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg"
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
              <Button variant="outline" onClick={() => setPage((p) => p + 1)} disabled={loading}>
                {loading ? 'Loading...' : 'Load More'}
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default Notifications;

