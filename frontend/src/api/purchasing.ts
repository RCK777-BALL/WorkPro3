/*
 * SPDX-License-Identifier: MIT
 */

import type {
  PurchaseOrder,
  PurchaseOrderPayload,
  PurchaseOrderStatus,
  ReceiptLine,
} from '@backend-shared/purchaseOrders';

import http from '@/lib/http';

export const fetchPurchaseOrders = async (): Promise<PurchaseOrder[]> => {
  const res = await http.get<PurchaseOrder[]>('/po');
  return res.data;
};

export const savePurchaseOrder = async (
  payload: PurchaseOrderPayload & { id?: string },
): Promise<PurchaseOrder> => {
  if (payload.id) {
    const res = await http.put<PurchaseOrder>(`/po/${payload.id}`, payload);
    return res.data;
  }
  const res = await http.post<PurchaseOrder>('/po', payload);
  return res.data;
};

export const updatePurchaseOrderStatus = async (
  purchaseOrderId: string,
  status: PurchaseOrderStatus,
): Promise<PurchaseOrder> => {
  const res = await http.post<PurchaseOrder>(`/po/${purchaseOrderId}/status`, { status });
  return res.data;
};

export const receivePurchaseOrder = async (
  purchaseOrderId: string,
  receipts: ReceiptLine[],
): Promise<PurchaseOrder> => {
  const res = await http.post<PurchaseOrder>(`/po/${purchaseOrderId}/receive`, { receipts });
  return res.data;
};
