/*
 * SPDX-License-Identifier: MIT
 */

import http from '@/lib/http';
import type { InventoryAlert, Part, PurchaseOrder, PurchaseOrderPayload, VendorSummary } from '@/types';

const BASE_PATH = '/inventory/v2';

export const fetchParts = async (): Promise<Part[]> => {
  const res = await http.get<Part[]>(`${BASE_PATH}/parts`);
  return res.data;
};

export const upsertPart = async (payload: Partial<Part> & { name: string; id?: string }): Promise<Part> => {
  if (payload.id) {
    const res = await http.put<Part>(`${BASE_PATH}/parts/${payload.id}`, payload);
    return res.data;
  }
  const res = await http.post<Part>(`${BASE_PATH}/parts`, payload);
  return res.data;
};

export const fetchVendors = async (): Promise<VendorSummary[]> => {
  const res = await http.get<VendorSummary[]>(`${BASE_PATH}/vendors`);
  return res.data;
};

export const fetchInventoryAlerts = async (): Promise<InventoryAlert[]> => {
  const res = await http.get<InventoryAlert[]>(`${BASE_PATH}/alerts`);
  return res.data;
};

export const createPurchaseOrder = async (payload: PurchaseOrderPayload): Promise<PurchaseOrder> => {
  const res = await http.post<PurchaseOrder>(`${BASE_PATH}/purchase-orders`, payload);
  return res.data;
};
