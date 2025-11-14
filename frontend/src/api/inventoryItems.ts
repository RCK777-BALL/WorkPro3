/*
 * SPDX-License-Identifier: MIT
 */

import http from '@/lib/http';
import type { InventoryItem } from '@/types';

export const fetchInventoryItems = async (): Promise<InventoryItem[]> => {
  const res = await http.get<InventoryItem[]>('/inventory');
  return res.data;
};
