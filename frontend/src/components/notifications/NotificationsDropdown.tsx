/*
 * SPDX-License-Identifier: MIT
 */

import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import { markNotificationRead } from '../../api/notifications';
import type { NotificationType } from '../../types';
import Card from '../common/Card';
import {
  getNotificationsSocket,
  closeNotificationsSocket,
} from '../../utils/notificationsSocket';
import { useToast } from '../../context/ToastContext';

 
 

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
  liveData?: boolean;
}

const NotificationsDropdown: React.FC<NotificationsDropdownProps> = ({
  isOpen,
  notifications,
  onClose,
  onMarkRead,
  liveData = true,
}) => {
  if (!isOpen) return null;

  const navigate = useNavigate();
  const { addToast } = useToast();
  const [items, setNotifications] = useState<NotificationType[]>(notifications);
  const menuRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      menuRef.current?.focus();
    } else {
      previousFocusRef.current?.focus();
    }
  }, [isOpen]);


  useEffect(() => {
 
    if (!liveData) return;

 
    const s = getNotificationsSocket();
    const handleCreate = (n: NotificationType) => {
      setNotifications((prev) => [n, ...prev]);
    };
    s.on('notification', handleCreate);
    return () => {
      s.off('notification', handleCreate);
      closeNotificationsSocket();
    };
  }, [liveData]);

  const unreadCount = items.filter((n) => !n.read).length;

  const markRead = async (id: string) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );

    try {
      await markNotificationRead(id);
    } catch {
      addToast('Failed to mark notification as read', 'error');
      // Revert on failure
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: false } : n))
      );
    }
  };

  return (
    <div ref={menuRef} tabIndex={-1} role="menu" aria-label="Notifications">
        <Card>
          <button data-testid="close-button" onClick={onClose}>
            Close
          </button>
          <span data-testid="unread-count">{unreadCount}</span>
    
          <ul>
            {items.map((n) => (
              <li key={n.id} className={`${colorClasses(n.type)} space-y-1`}>
                <button
                  data-testid="notification"
                  data-read={n.read ? 'true' : 'false'}
                  onClick={() => {
                    onMarkRead(n.id);
                    markRead(n.id);
                  }}
                >
                  <div className="flex items-center justify-between text-sm font-medium">
                    <span>{n.title}</span>
                    <span className="text-xs uppercase tracking-wide text-neutral-500">
                      {n.category.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-left text-sm">{n.message}</div>
                  <div className="text-xs text-neutral-500">State: {n.deliveryState}</div>
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
    </div>
  );
};

export default NotificationsDropdown;
