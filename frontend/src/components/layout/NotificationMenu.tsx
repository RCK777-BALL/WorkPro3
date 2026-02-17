/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, CheckCircle2, Clock3, Info, Link2 } from "lucide-react";

import { formatDistanceToNow } from "date-fns";
import clsx from "clsx";

import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/api/notifications";
import { type NotificationType } from "@/types";
import { getNotificationsSocket } from "@/utils/notificationsSocket";

type NotificationMenuProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const toneToClasses: Record<NotificationType["type"], string> = {
  info: "bg-sky-500/10 text-sky-600 dark:text-sky-300",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-300",
  critical: "bg-rose-500/10 text-rose-600 dark:text-rose-300",
};

const normalizeNotification = (value: Partial<NotificationType> & { _id?: string }): NotificationType => ({
  id: value._id ?? value.id ?? crypto.randomUUID(),
  title: value.title ?? "Notification",
  message: value.message ?? "",
  type: value.type ?? "info",
  category: value.category ?? "updated",
  deliveryState: value.deliveryState ?? "pending",
  createdAt: value.createdAt ?? new Date().toISOString(),
  read: value.read ?? false,
  workOrderId: value.workOrderId,
  inventoryItemId: value.inventoryItemId,
  pmTaskId: value.pmTaskId,
});

export default function NotificationMenu({ open, onOpenChange }: NotificationMenuProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [items, setItems] = useState<NotificationType[]>([]);
  const [loading, setLoading] = useState(false);
  const [serverUnreadCount, setServerUnreadCount] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;

    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || buttonRef.current?.contains(target)) {
        return;
      }
      onOpenChange(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open || items.length > 0 || loading) return;

    const load = async () => {
      setLoading(true);
      try {
        const response = await fetchNotifications({ limit: 10 });
        const list = response?.items ?? [];
        setItems(list.map((entry) => normalizeNotification(entry)));
        setServerUnreadCount(response?.unreadCount ?? null);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [open, items.length, loading]);

  useEffect(() => {
    const socket = getNotificationsSocket();
    const handleIncoming = (notification: NotificationType) => {
      setServerUnreadCount((prev) => (prev === null ? prev : prev + 1));
      setItems((prev) => [normalizeNotification(notification), ...prev].slice(0, 10));
    };
    socket.on('notification', handleIncoming);
    return () => {
      socket.off('notification', handleIncoming);
    };
  }, []);

  const unreadCount = useMemo(() => {
    const localUnread = items.filter((item) => !item.read).length;
    return serverUnreadCount ?? localUnread;
  }, [items, serverUnreadCount]);

  const markOne = async (id: string) => {
    let shouldDecrement = false;
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        if (!item.read) {
          shouldDecrement = true;
        }
        return { ...item, read: true };
      }),
    );
    if (shouldDecrement) {
      setServerUnreadCount((prev) => (prev === null ? prev : Math.max(prev - 1, 0)));
    }
    try {
      await markNotificationRead(id);
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  };

  const markAll = async () => {
    setItems((prev) => prev.map((item) => ({ ...item, read: true })));
    setServerUnreadCount(0);
    try {
      await markAllNotificationsRead();
    } catch (err) {
      console.error('Failed to mark notifications as read', err);
    }
    onOpenChange(false);
  };

  const renderIcon = (notification: NotificationType) => {
    if (notification.type === 'critical') return <Info className="h-4 w-4" />;
    if (notification.type === 'warning') return <Clock3 className="h-4 w-4" />;
    return <CheckCircle2 className="h-4 w-4" />;
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => onOpenChange(!open)}
        className={clsx(
          "relative flex h-10 w-10 items-center justify-center rounded-full",
          "border border-[var(--wp-color-border)] bg-[var(--wp-color-surface)] text-[var(--wp-color-text)] transition",
          "hover:border-[var(--wp-color-border-strong)] hover:bg-[var(--wp-color-surface-elevated)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--wp-color-focus)]",
        )}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={open ? "Close notifications" : "Open notifications"}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary-600 px-1 text-[10px] font-medium text-white">
            {unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 z-30 mt-3 w-96 overflow-hidden rounded-2xl border border-[var(--wp-color-border)] bg-[color-mix(in_srgb,var(--wp-color-surface)_92%,transparent)] text-[var(--wp-color-text)] shadow-2xl backdrop-blur"
        >
          <header className="flex items-center justify-between border-b border-[var(--wp-color-border)] bg-[var(--wp-color-surface)] px-4 py-3 text-sm font-medium text-[var(--wp-color-text)]">
            <span>Notifications</span>
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                className="text-[var(--wp-color-primary)] transition hover:opacity-90 focus:outline-none"
                onClick={markAll}
                disabled={items.length === 0}
              >
                Mark all as read
              </button>
              <a
                href="/notifications"
                className="inline-flex items-center gap-1 text-[var(--wp-color-primary)] hover:opacity-90"
              >
                <Link2 className="h-3 w-3" /> Feed
              </a>
            </div>
          </header>
          <div className="divide-y divide-[var(--wp-color-border)] bg-[color-mix(in_srgb,var(--wp-color-surface)_82%,transparent)]">
            {items.map((notification) => (
              <article key={notification.id} className="flex items-start gap-3 px-4 py-3">
                <span
                  className={clsx(
                    "mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full",
                    toneToClasses[notification.type],
                  )}
                  aria-hidden
                >
                  {renderIcon(notification)}
                </span>
                <div className="flex-1 text-sm text-[var(--wp-color-text)]">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-[var(--wp-color-text)]">{notification.title}</p>
                    <span className="rounded-full bg-[var(--wp-color-surface-elevated)] px-2 py-0.5 text-[10px] uppercase tracking-wide text-[var(--wp-color-text-muted)]">
                      {notification.category.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="mt-1 text-[var(--wp-color-text-muted)]">{notification.message}</p>
                  <div className="mt-2 flex items-center justify-between text-xs text-[var(--wp-color-text-muted)]">
                    <span>{formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}</span>
                    {!notification.read ? (
                      <button
                        type="button"
                        className="text-[var(--wp-color-primary)] hover:opacity-90"
                        onClick={() => markOne(notification.id)}
                      >
                        Mark read
                      </button>
                    ) : (
                      <span className="text-emerald-400">Delivered</span>
                    )}
                  </div>
                </div>
              </article>
            ))}

            {items.length === 0 && !loading && (
              <div className="px-4 py-8 text-center text-sm text-[var(--wp-color-text-muted)]">No notifications yet</div>
            )}

            {loading && (
              <div className="px-4 py-4 text-center text-xs text-[var(--wp-color-text-muted)]">Loading notifications...</div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
