import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { markNotificationRead } from '../../utils/api';
import type { NotificationType } from '../../types';
import Card from '../common/Card';
import { getNotificationsSocket } from '../../utils/notificationsSocket';
 

const colorClasses = (type: NotificationType['type']) => {
  switch (type) {
    case 'critical':
      return 'text-error-600';
    case 'warning':
      return 'text-warning-600';
    case 'info':
    default:
      return 'text-info-600';
  }
};

interface NotificationsDropdownProps {
  isOpen: boolean;
  notifications: NotificationType[];
  onClose: () => void;
  onMarkRead: (id: string) => void;
}

const NotificationsDropdown: React.FC<NotificationsDropdownProps> = ({
  isOpen,
  notifications,
  onClose,
  onMarkRead,
}) => {
  if (!isOpen) return null;

  const navigate = useNavigate();
  const [items, setNotifications] = useState<NotificationType[]>(notifications);

  useEffect(() => {
    const s = getNotificationsSocket();
    const handleCreate = (n: NotificationType) => {
      setNotifications((prev) => [n, ...prev]);
    };
    s.on('notification', handleCreate);
    return () => {
      s.off('notification', handleCreate);
    };
  }, []);

  const unreadCount = items.filter((n) => !n.read).length;

  const markRead = async (id: string) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );

    try {
      await markNotificationRead(id);
    } catch (err) {
      console.error('Failed to mark notification as read', err);
      // Revert on failure
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: false } : n))
      );
    }
  };

  return (
    <Card>
      <button data-testid="close-button" onClick={onClose}>
        Close
      </button>
      <span data-testid="unread-count">{unreadCount}</span>

      <ul>
        {items.map((n) => (
          <li key={n.id} className={colorClasses(n.type)}>
            <button
              data-testid="notification"
              data-read={n.read ? 'true' : 'false'}
              onClick={() => {
                onMarkRead(n.id);
                markRead(n.id);
              }}
            >
              {n.message}
            </button>
          </li>
        ))}

        {items.length === 0 && (
          <li className="py-8 text-center text-neutral-500 dark:text-neutral-400">
            No notifications
          </li>
        )}
      </ul>

      <div className="p-2 border-t border-neutral-100 dark:border-neutral-700 text-center">
        <button
          onClick={() => {
            onClose();
            navigate('/notifications');
          }}
          className="text-sm text-primary-600 hover:underline"
        >
          View All Notifications
        </button>
      </div>
    </Card>
  );
};

export default NotificationsDropdown;
