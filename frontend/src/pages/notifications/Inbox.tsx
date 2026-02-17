/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Filter,
  Mail,
  MessageSquare,
  Phone,
  Settings as SettingsIcon,
} from 'lucide-react';

import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/api/notifications';
import http from '@/lib/http';
import { useSettingsStore } from '@/store/settingsStore';
import type { NotificationSettings } from '@/store/settingsStore';
import { useNotifications } from '@/store/notificationsSlice';
import type { NotificationType } from '@/types';
import { getNotificationsSocket } from '@/utils/notificationsSocket';
import type { LowStockAlert } from '@/store/notificationsSlice';

type Notification = NotificationType & { assetId?: string };

type FilterKey = 'all' | Notification['category'];

const normalizeNotification = (n: Partial<Notification> & { _id?: string; created_at?: string }): Notification => ({
  id: n._id || n.id || crypto.randomUUID(),
  title: n.title || 'Notification',
  message: n.message || '',
  type: n.type || 'info',
  category: n.category || 'updated',
  deliveryState: n.deliveryState || 'pending',
  createdAt: n.createdAt || n.created_at || new Date().toISOString(),
  read: n.read ?? false,
  assetId: (n as any).assetId,
  workOrderId: n.workOrderId,
  inventoryItemId: n.inventoryItemId,
  pmTaskId: n.pmTaskId,
});

const NotificationsInbox = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState<FilterKey>('all');
  const limit = 10;
  const notificationSettings = useSettingsStore((state) => state.notifications);
  const setNotificationSettings = useSettingsStore((state) => state.setNotifications);
  const {
    lowStockAlerts,
    alertsLoading,
    alertsError,
    fetchLowStock,
    acknowledge,
    clear,
  } = useNotifications((state) => ({
    lowStockAlerts: state.lowStockAlerts,
    alertsLoading: state.alertsLoading,
    alertsError: state.alertsError,
    fetchLowStock: state.fetchLowStock,
    acknowledge: state.acknowledge,
    clear: state.clear,
  }));

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
          icon: <Mail className="h-4 w-4 text-primary-500" />,
        },
        {
          key: 'pushNotifications',
          label: 'Push notifications',
          description: 'Stay up to date with browser alerts',
          icon: <Bell className="h-4 w-4 text-amber-500" />,
        },
        {
          key: 'smsNotifications',
          label: 'SMS notifications',
          description: 'Send text alerts to your phone',
          icon: <Phone className="h-4 w-4 text-emerald-500" />,
        },
      ] satisfies { key: ToggleKey; label: string; description: string; icon: ReactNode }[],
    []
  );

  const eventOptions = useMemo(
    () =>
      [
        {
          key: 'assignedWorkOrders',
          label: 'Assigned work orders',
          description: 'Alert me when I am assigned to a work order',
          icon: <MessageSquare className="h-4 w-4 text-primary-500" />,
        },
        {
          key: 'slaBreachAlerts',
          label: 'SLA breaches',
          description: 'Highlight any SLA breach in my queue',
          icon: <AlertTriangle className="h-4 w-4 text-amber-500" />,
        },
        {
          key: 'inventoryLowStock',
          label: 'Low stock thresholds',
          description: 'Notify when inventory hits reorder levels',
          icon: <Filter className="h-4 w-4 text-emerald-500" />,
        },
        {
          key: 'preventiveMaintenanceDue',
          label: 'Preventive maintenance due',
          description: 'Remind me when PM tasks generate work',
          icon: <Bell className="h-4 w-4 text-sky-500" />,
        },
        {
          key: 'workOrderUpdates',
          label: 'Work order updates',
          description: 'Track updates on work orders I follow',
          icon: <MessageSquare className="h-4 w-4 text-primary-500" />,
        },
        {
          key: 'maintenanceReminders',
          label: 'Maintenance reminders',
          description: 'Reminder emails for upcoming PM tasks',
          icon: <Bell className="h-4 w-4 text-amber-500" />,
        },
        {
          key: 'inventoryAlerts',
          label: 'Inventory alerts',
          description: 'Notify when reorder points are reached',
          icon: <Filter className="h-4 w-4 text-emerald-500" />,
        },
        {
          key: 'systemUpdates',
          label: 'System updates',
          description: 'Product announcements and release notes',
          icon: <AlertTriangle className="h-4 w-4 text-amber-600" />,
        },
      ] satisfies { key: ToggleKey; label: string; description: string; icon: ReactNode }[],
    []
  );

  const fetchPage = async (pageNum: number) => {
    try {
      setLoading(true);
      const res = await fetchNotifications({ page: pageNum, limit });
      const data = res?.items ?? [];
      const mapped: Notification[] = data.map((n: Partial<Notification>) => normalizeNotification(n));
      setNotifications((prev) => (pageNum === 1 ? mapped : [...prev, ...mapped]));
      setHasMore(data.length === limit);
    } catch (err) {
      console.error('Failed to load notifications', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPage(page);
  }, [page]);

  useEffect(() => {
    void fetchLowStock();
  }, [fetchLowStock]);

  useEffect(() => {
    const socket = getNotificationsSocket();
    const handleIncoming = (payload: NotificationType) => {
      setNotifications((prev) => [normalizeNotification(payload), ...prev]);
    };
    socket.on('notification', handleIncoming);
    return () => {
      socket.off('notification', handleIncoming);
    };
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await markNotificationRead(id);
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

  const markAll = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await markAllNotificationsRead();
    } catch (err) {
      console.error('Failed to mark notifications as read', err);
    }
  };

  const filteredNotifications = useMemo(
    () =>
      notifications.filter((n) =>
        filter === 'all'
          ? true
          : filter === 'overdue'
            ? n.category === 'overdue' || n.category === 'comment'
            : n.category === filter,
      ),
    [filter, notifications]
  );

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const renderLink = (notification: Notification) => {
    if (notification.assetId) return `/assets/${notification.assetId}`;
    if (notification.workOrderId) return `/work-orders/${notification.workOrderId}`;
    if (notification.inventoryItemId) return `/inventory/${notification.inventoryItemId}`;
    return undefined;
  };

  const lowStockSeverity = (alert: Pick<LowStockAlert, 'quantity' | 'reorderPoint'>) => {
    if (alert.quantity <= 0) return 'critical' as const;
    if (alert.quantity <= alert.reorderPoint) return 'warning' as const;
    return 'ok' as const;
  };

  const severityClasses: Record<'ok' | 'warning' | 'critical', string> = {
    ok: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-100 text-amber-700 border-amber-200',
    critical: 'bg-rose-100 text-rose-700 border-rose-200',
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-[var(--wp-color-text-muted)]">Engagement</p>
          <h1 className="text-2xl font-semibold text-[var(--wp-color-text)] dark:text-[var(--wp-color-text)]">Notification Center</h1>
          <p className="text-sm text-[var(--wp-color-text-muted)]">Track new work assignments, SLA risks, stock issues, and PM reminders.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button as={Link} to="/notifications/settings" variant="outline" icon={<SettingsIcon className="h-4 w-4" />}>
            Notification settings
          </Button>
          <Button variant="primary" onClick={markAll} disabled={notifications.length === 0}>
            Mark all read
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Channel preferences" className="lg:col-span-2" subtitle="Control where alerts are delivered">
          <div className="space-y-4">
            {toggleOptions.map(({ key, label, description, icon }) => (
              <div className="flex items-center justify-between rounded-lg border border-[var(--wp-color-border)] bg-[var(--wp-color-surface)]/60 p-3 dark:border-[var(--wp-color-border)] dark:bg-[var(--wp-color-surface-elevated)]" key={key}>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{icon}</div>
                  <div>
                    <p className="text-sm font-medium text-[var(--wp-color-text)] dark:text-[var(--wp-color-text)]">{label}</p>
                    <p className="text-xs text-[var(--wp-color-text-muted)] dark:text-[var(--wp-color-text-muted)]">{description}</p>
                  </div>
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
                  <div className="w-11 h-6 bg-[color-mix(in srgb,var(--wp-color-text) 12%, transparent)] dark:bg-[var(--wp-color-surface-elevated)] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[var(--wp-color-surface)] after:border-[var(--wp-color-border)] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600" />
                </label>
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium text-[var(--wp-color-text)] dark:text-[var(--wp-color-text)]">SMS number</label>
              <p className="text-xs text-[var(--wp-color-text-muted)]">Required for SMS delivery.</p>
              <input
                className="mt-2 w-full rounded-md border border-[var(--wp-color-border)] px-3 py-2 text-sm focus:border-primary-500 focus:outline-none dark:border-[var(--wp-color-border)] dark:bg-[var(--wp-color-surface-elevated)]"
                value={notificationSettings.smsNumber}
                onChange={(event) => setNotificationSettings({ smsNumber: event.target.value })}
                placeholder="+15555555555"
              />
            </div>
          </div>
        </Card>

        <Card title="Event subscriptions" subtitle="Choose which alerts to surface">
          <div className="space-y-3">
            {eventOptions.map(({ key, label, description, icon }) => (
              <div className="flex items-center justify-between" key={key}>
                <div className="flex items-start gap-3">
                  {icon}
                  <div>
                    <p className="text-sm font-semibold text-[var(--wp-color-text)] dark:text-[var(--wp-color-text)]">{label}</p>
                    <p className="text-xs text-[var(--wp-color-text-muted)] dark:text-[var(--wp-color-text-muted)]">{description}</p>
                  </div>
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
                  <div className="w-11 h-6 bg-[color-mix(in srgb,var(--wp-color-text) 12%, transparent)] dark:bg-[var(--wp-color-surface-elevated)] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[var(--wp-color-surface)] after:border-[var(--wp-color-border)] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600" />
                </label>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card
        title="Low stock alerts"
        subtitle="Acknowledgable alerts for parts hitting configured reorder points"
      >
        {alertsError ? (
          <div className="mb-3 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            <span>{alertsError}</span>
            <Button size="xs" variant="ghost" onClick={() => fetchLowStock()}>
              Retry
            </Button>
          </div>
        ) : null}

        {alertsLoading ? (
          <p className="text-sm text-[var(--wp-color-text-muted)]">Loading low stock alerts…</p>
        ) : lowStockAlerts.length === 0 ? (
          <p className="text-sm text-[var(--wp-color-text-muted)]">No inventory alerts at the moment.</p>
        ) : (
          <ul className="space-y-3">
            {lowStockAlerts.map((alert) => {
              const severity = lowStockSeverity(alert);
              return (
                <li
                  key={alert.id}
                  className="flex items-start justify-between rounded-lg border border-[var(--wp-color-border)] bg-[var(--wp-color-surface)]/80 p-3 text-sm dark:border-[var(--wp-color-border)] dark:bg-[var(--wp-color-surface-elevated)]"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${severityClasses[severity]}`}
                      >
                        {severity === 'critical' ? 'Critical' : severity === 'warning' ? 'Low' : 'Healthy'}
                      </span>
                      <span className="font-semibold text-[var(--wp-color-text)] dark:text-[var(--wp-color-text)]">{alert.partName}</span>
                      {alert.acknowledged ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
                          <CheckCircle2 className="h-3 w-3" /> Acknowledged
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-[var(--wp-color-text-muted)] dark:text-[var(--wp-color-text-muted)]">
                      On hand: {alert.quantity} • Reorder point: {alert.reorderPoint}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Button
                      size="xs"
                      variant="secondary"
                      onClick={() => acknowledge(alert.id)}
                      disabled={alert.acknowledged}
                    >
                      Ack
                    </Button>
                    <Button size="xs" variant="danger" onClick={() => clear(alert.id)}>
                      Clear
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card
        title="Notification Feed"
        subtitle="Live updates from the notification service"
        headerActions={
          <div className="flex items-center gap-2 text-sm">
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value as FilterKey)}
              className="rounded-md border border-[var(--wp-color-border)] px-3 py-2 text-sm dark:border-[var(--wp-color-border)] dark:bg-[var(--wp-color-surface-elevated)]"
            >
              <option value="all">All categories</option>
              <option value="assigned">Assignments</option>
              <option value="overdue">SLA & Inventory Alerts</option>
              <option value="pm_due">PM reminders</option>
              <option value="comment">Comments</option>
            </select>
            <Button variant="outline" size="sm" onClick={() => fetchPage(1)} disabled={loading}>
              Refresh
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {filteredNotifications.map((n) => {
            const link = renderLink(n);
            return (
              <div
                key={n.id}
                className="rounded-lg border border-[var(--wp-color-border)] bg-[var(--wp-color-surface)] p-4 shadow-sm dark:border-[var(--wp-color-border)] dark:bg-[var(--wp-color-surface-elevated)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-[var(--wp-color-text)] dark:text-[var(--wp-color-text)]">{n.title}</p>
                    <p className="text-sm text-[var(--wp-color-text-muted)] dark:text-[var(--wp-color-text-muted)]">{n.message}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--wp-color-text-muted)]">
                      <span className="rounded-full bg-[var(--wp-color-surface-elevated)] px-2 py-1 dark:bg-[var(--wp-color-surface-elevated)]">{n.category.replace('_', ' ')}</span>
                      <span className="rounded-full bg-[var(--wp-color-surface-elevated)] px-2 py-1 dark:bg-[var(--wp-color-surface-elevated)]">{n.type}</span>
                      <span>{formatTime(n.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!n.read && (
                      <Button size="sm" variant="outline" onClick={() => markAsRead(n.id)}>
                        Mark as Read
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => dismiss(n.id)}>
                      Dismiss
                    </Button>
                    {link && (
                      <Link to={link} className="text-sm text-primary-600 hover:underline">
                        Open
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {filteredNotifications.length === 0 && !loading && (
            <p className="text-center text-[var(--wp-color-text-muted)]">No notifications</p>
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

export default NotificationsInbox;

