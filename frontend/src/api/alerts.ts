/*
 * SPDX-License-Identifier: MIT
 */

import http from '@/lib/http';
import type { InventoryAlert } from '@/types';

export interface AcknowledgeResponse {
  success?: boolean;
  data?: InventoryAlert;
}

export const fetchStockAlerts = async (): Promise<InventoryAlert[]> => {
  const res = await http.get<InventoryAlert[]>('/inventory/v2/alerts');
  return res.data;
};

export const acknowledgeAlert = async (id: string): Promise<AcknowledgeResponse> => {
  const res = await http.post<AcknowledgeResponse>(`/alerts/${id}/ack`);
  return res.data;
};

export const clearAlert = async (id: string): Promise<AcknowledgeResponse> => {
  const res = await http.delete<AcknowledgeResponse>(`/alerts/${id}/ack`);
  return res.data;
};
