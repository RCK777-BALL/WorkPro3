/*
 * SPDX-License-Identifier: MIT
 */

import { create } from 'zustand';
import { shallow } from 'zustand/shallow';

import { acknowledgeAlert, clearAlert, fetchStockAlerts } from '@/api/alerts';
import { fetchInventoryAlerts } from '@/api/inventory';
import { fetchNotifications, markNotificationRead } from '@/api/notifications';
import http from '@/lib/http';
import type { InventoryAlert, NotificationType } from '@/types';

export type LowStockAlert = InventoryAlert & {
  id: string;
  acknowledged?: boolean;
};

interface NotificationsState {
  notifications: NotificationType[];
  lowStockAlerts: LowStockAlert[];
  loading: boolean;
  alertsLoading: boolean;
  error: string | null;
  alertsError: string | null;
  fetchAll: () => Promise<void>;
  fetchLowStock: () => Promise<void>;
  addNotification: (notification: NotificationType) => void;
  markRead: (id: string) => Promise<void>;
  dismiss: (id: string) => Promise<void>;
  acknowledge: (id: string) => Promise<void>;
  clear: (id: string) => Promise<void>;
  reset: () => void;
}

const initialState: Pick<
  NotificationsState,
  'notifications' | 'lowStockAlerts' | 'loading' | 'alertsLoading' | 'error' | 'alertsError'
> = {
  notifications: [],
  lowStockAlerts: [],
  loading: false,
  alertsLoading: false,
  error: null,
  alertsError: null,
};

const normalizeLowStockAlert = (alert: InventoryAlert): LowStockAlert => ({
  ...alert,
  id: alert.id ?? alert.partId,
  reorderPoint: alert.reorderPoint ?? alert.minLevel ?? 0,
  status: alert.status ?? 'open',
  acknowledged: (alert.status ?? 'open') !== 'open',
});

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  ...initialState,
  fetchAll: async () => {
    set({ loading: true, error: null });
    try {
      const notes = await fetchNotifications({ limit: 20 });
      set({
        notifications: Array.isArray(notes)
          ? notes
          : Array.isArray((notes as any).items)
            ? (notes as any).items
            : [],
      });
    } catch (err) {
      console.error('Failed to load notifications', err);
      set({ error: 'Unable to load notifications' });
    } finally {
      set({ loading: false });
    }
  },
  fetchLowStock: async () => {
    set({ alertsLoading: true, alertsError: null });
    try {
      const alerts = await (async () => {
        try {
          return await fetchInventoryAlerts();
        } catch (legacyErr) {
          console.warn('Falling back to legacy alert endpoint', legacyErr);
          return fetchStockAlerts();
        }
      })();
      const items = Array.isArray(alerts) ? alerts : alerts.items ?? [];
      set({ lowStockAlerts: items.map(normalizeLowStockAlert) });
    } catch (err) {
      console.error('Failed to load low stock alerts', err);
      set({ alertsError: 'Unable to load low stock alerts' });
    } finally {
      set({ alertsLoading: false });
    }
  },
  addNotification: (notification) =>
    set((state) => ({ notifications: [notification, ...state.notifications].slice(0, 20) })),
  markRead: async (id) => {
    const prev = get().notifications;
    set({ notifications: prev.map((n) => (n.id === id ? { ...n, read: true } : n)) });
    try {
      await markNotificationRead(id);
    } catch (err) {
      console.error('Failed to mark notification as read', err);
      set({ notifications: prev });
      set({ error: 'Unable to mark notification as read' });
    }
  },
  dismiss: async (id) => {
    const prev = get().notifications;
    set({ notifications: prev.filter((n) => n.id !== id) });
    try {
      await http.delete(`/notifications/${id}`);
    } catch (err) {
      console.error('Failed to dismiss notification', err);
      set({ notifications: prev, error: 'Unable to dismiss notification' });
    }
  },
  acknowledge: async (id) => {
    const prev = get().lowStockAlerts;
    const next = prev.map((alert) =>
      alert.id === id ? { ...alert, acknowledged: true, status: 'approved' as const } : alert,
    );
    set({ lowStockAlerts: next });
    try {
      await acknowledgeAlert(id);
    } catch (err) {
      console.error('Failed to acknowledge alert', err);
      set({ lowStockAlerts: prev, alertsError: 'Unable to acknowledge alert' });
    }
  },
  clear: async (id) => {
    const prev = get().lowStockAlerts;
    const remaining = prev.filter((alert) => alert.id !== id);
    set({ lowStockAlerts: remaining });
    try {
      await clearAlert(id);
    } catch (err) {
      console.error('Failed to clear alert', err);
      set({ lowStockAlerts: prev, alertsError: 'Unable to clear alert' });
    }
  },
  reset: () => set({ ...initialState }),
}));

export const useNotifications = <T>(
  selector: (state: NotificationsState) => T = (state) => state as unknown as T,
) => useNotificationsStore(selector, shallow);
