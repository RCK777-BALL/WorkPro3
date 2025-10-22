/*
 * SPDX-License-Identifier: MIT
 */

import React, { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import Card from '@common/Card';
import { useToast } from '../../context/ToastContext';
import { useNavigate } from 'react-router-dom';
import { markNotificationRead } from '@/api/notifications';
import { useSummary } from '@/hooks/useSummaryData';
import { useTranslation } from 'react-i18next';

import type { Notification } from '@/types';

interface NotificationMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface HeaderNotification extends Notification {
  link?: string;
}

const NotificationMenu: React.FC<NotificationMenuProps> = ({ open, onOpenChange }) => {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const [notifications, setNotifications] = useState<HeaderNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, fetchNotifications] = useSummary<HeaderNotification[]>('/notifications', [], {
    auto: false,
    poll: false,
    ttlMs: 30_000,
  });

  useEffect(() => {
    if (data) setNotifications(data);
  }, [data]);

  useEffect(() => {
    if (open) {
      setLoading(true);
      fetchNotifications()
        .then((res) => {
          if (!res) {
            addToast(t('header.failedToLoadNotifications'), 'error');
            setError(t('header.failedToLoadNotifications'));
          } else {
            setError(null);
          }
        })
        .finally(() => setLoading(false));
    }
  }, [open, fetchNotifications, addToast, t]);

  useEffect(() => {
    if (open) {
      menuRef.current?.focus();
    } else {
      buttonRef.current?.focus();
    }
  }, [open]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getTimeAgo = (createdAt: string) => {
    const now = new Date();
    const date = new Date(createdAt);
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return t('time.justNow');
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return t('time.minutesAgo', { count: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t('time.hoursAgo', { count: hours });
    const days = Math.floor(hours / 24);
    return t('time.daysAgo', { count: days });
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'critical':
        return 'bg-error-50 dark:bg-error-900/20 text-error-700 dark:text-error-200 border-error-200 dark:border-error-800';
      case 'warning':
        return 'bg-warning-50 dark:bg-warning-900/20 text-warning-700 dark:text-warning-200 border-warning-200 dark:border-warning-800';
      default:
        return 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-200 border-primary-200 dark:border-primary-800';
    }
  };

  const handleNotificationClick = async (notification: HeaderNotification) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)),
    );

    try {
      await markNotificationRead(notification.id);
      if (notification.link) {
        navigate(notification.link);
      }
      onOpenChange(false);
    } catch {
      addToast('Failed to mark notification as read', 'error');
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read: false } : n)),
      );
    }
  };

  const toggle = () => onOpenChange(!open);

  return (
    <div className="relative">
      <button
        className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 focus:outline-none relative"
        aria-label="Notifications"
        aria-haspopup="true"
        aria-expanded={open}
        ref={buttonRef}
        onClick={toggle}
      >
        <Bell size={20} className="dark:text-white" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-error-500 text-white text-xs flex items-center justify-center rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={menuRef}
          tabIndex={-1}
          role="menu"
          aria-label="Notifications"
          className="absolute right-0 mt-2 w-80 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 z-50"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              onOpenChange(false);
            }
          }}
        >
          <Card
            title={t('header.notifications')}
            subtitle={`${unreadCount} unread notifications`}
            noPadding
          >
            <div className="max-h-96 overflow-y-auto">
              {loading && (
                <div className="py-8 text-center text-neutral-700 dark:text-neutral-300">
                  Loading...
                </div>
              )}

              {!loading && error && (
                <div className="py-8 text-center text-neutral-700 dark:text-neutral-300">
                  {error}
                </div>
              )}

              {!loading && !error &&
                notifications.map((notification) => (
                  <button
                    key={notification.id}
                    className={`w-full text-left p-4 border-b border-neutral-100 dark:border-neutral-700 last:border-b-0 ${notification.read ? 'opacity-75' : ''} ${getNotificationColor(notification.type)}`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-medium">{notification.title}</h4>
                      <span className="text-xs">{getTimeAgo(notification.createdAt)}</span>
                    </div>
                    <p className="text-sm">{notification.message}</p>
                  </button>
                ))}

              {!loading && !error && notifications.length === 0 && (
                <div className="py-8 text-center text-neutral-700 dark:text-neutral-300">
                  {t('header.noNotifications')}
                </div>
              )}
            </div>
            <div className="p-2 border-t border-neutral-100 dark:border-neutral-700 text-center">
              <button
                onClick={() => {
                  onOpenChange(false);
                  navigate('/notifications');
                }}
                className="text-sm text-primary-600 hover:underline"
              >
                {t('header.viewAll')}
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default NotificationMenu;

