/*
 * SPDX-License-Identifier: MIT
 */

import http from '@/lib/http';
import type { InventoryAlert } from '@/types';

export const fetchStockAlerts = async (): Promise<InventoryAlert[]> => {
  const res = await http.get<{ items?: InventoryAlert[] } | InventoryAlert[]>('/inventory/v2/alerts');
  const payload = res.data as { items?: InventoryAlert[] } | InventoryAlert[];
  return Array.isArray(payload) ? payload : payload.items ?? [];
};

export const acknowledgeAlert = async (id: string): Promise<InventoryAlert> => {
  const res = await http.post<InventoryAlert>(`/inventory/v2/alerts/${id}/status`, {
    action: 'approve',
  });
  return res.data;
};

export const clearAlert = async (id: string): Promise<InventoryAlert> => {
  const res = await http.post<InventoryAlert>(`/inventory/v2/alerts/${id}/status`, {
    action: 'skip',
  });
  return res.data;
};
