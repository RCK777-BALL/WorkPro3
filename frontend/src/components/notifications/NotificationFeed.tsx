/*
 * SPDX-License-Identifier: MIT
 */

import React, { useEffect, useState } from 'react';
import Card from '@common/Card';
import { getNotificationsSocket } from '@/utils/notificationsSocket';
 
import Badge from '@common/Badge';
import { useSocketStore, type SocketState } from '@/store/socketStore';
import type {
  NotificationType,
  WorkOrderUpdatePayload,
  InventoryUpdatePayload,
} from '@/types';

const NotificationFeed: React.FC = () => {
  const connected = useSocketStore((s: SocketState) => s.connected);
  const [items, setItems] = useState<NotificationType[]>([]);

  useEffect(() => {
    const s = getNotificationsSocket();

    const handleWorkOrder = (data: WorkOrderUpdatePayload) => {
      setItems(prev => [
        ...prev,
        {
          id: data._id || Math.random().toString(36),
          title: 'Work Order Update',
          message: `Work order update: ${data.title || data._id}`,
          type: 'info',
          createdAt: new Date().toISOString(),
          read: false,
        },
      ]);
    };

    const handleInventory = (data: InventoryUpdatePayload) => {
      setItems(prev => [
        ...prev,
        {
          id: data._id || Math.random().toString(36),
          title: 'Inventory Update',
          message: `Inventory update: ${data.name || data._id}`,
          type: 'warning',
          createdAt: new Date().toISOString(),
          read: false,
        },
      ]);
    };

    s.on('workOrderUpdated', handleWorkOrder);
    s.on('inventoryUpdated', handleInventory);

    return () => {
      s.off('workOrderUpdated', handleWorkOrder);
      s.off('inventoryUpdated', handleInventory);
    };
  }, []);

  return (
    <Card
      title="Live Notifications"
      headerActions={
        <Badge
          text={connected ? 'Connected' : 'Disconnected'}
          size="sm"
          className={connected ? 'bg-success-100 text-success-700 dark:bg-success-900 dark:text-success-200' : 'bg-error-100 text-error-700 dark:bg-error-900 dark:text-error-200'}
        />
      }
    >
      <ul className="space-y-2">
        {items.map((n) => (
          <li key={n.id} className="border-b border-neutral-200 dark:border-neutral-700 pb-2 text-sm">
            <p className="font-medium text-neutral-800 dark:text-neutral-200">{n.title}</p>
            <p className="text-neutral-800 dark:text-neutral-200">{n.message}</p>
            <p className="text-xs text-neutral-500">{new Date(n.createdAt).toLocaleTimeString()}</p>
          </li>
        ))}
        {items.length === 0 && (
          <li className="text-sm text-neutral-500">No notifications yet</li>
        )}
      </ul>
    </Card>
  );
};

export default NotificationFeed;
