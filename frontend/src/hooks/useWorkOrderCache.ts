/*
 * SPDX-License-Identifier: MIT
 */

import type { WorkOrder } from '@/types';
import { cacheWorkOrders, getCachedWorkOrders } from '@/store/dataStore';
import { safeLocalStorage } from '@/utils/safeLocalStorage';

const LOCAL_KEY = 'offline-workorders';

export const loadWorkOrderCache = async (): Promise<WorkOrder[]> => {
  try {
    const cached = await getCachedWorkOrders();
    if (cached.length > 0) {
      return cached as WorkOrder[];
    }
  } catch (err) {
    console.error('Failed to read IndexedDB work order cache', err);
  }

  const fallback = safeLocalStorage.getItem(LOCAL_KEY);
  return fallback ? (JSON.parse(fallback) as WorkOrder[]) : [];
};

export const saveWorkOrderCache = async (orders: WorkOrder[]) => {
  try {
    await cacheWorkOrders(orders);
  } catch (err) {
    console.error('Failed to write IndexedDB work order cache', err);
  }

  safeLocalStorage.setItem(LOCAL_KEY, JSON.stringify(orders));
};

export const clearWorkOrderCache = async () => {
  try {
    await cacheWorkOrders([]);
  } catch (err) {
    console.error('Failed to clear IndexedDB work order cache', err);
  }

  safeLocalStorage.removeItem(LOCAL_KEY);
};
