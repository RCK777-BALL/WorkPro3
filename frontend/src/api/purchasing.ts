/*
 * SPDX-License-Identifier: MIT
 */

import http from '@/lib/http';
import type { Vendor } from '@/types/vendor';

export type PurchaseOrderStatus = 'Draft' | 'Pending' | 'Approved' | 'Ordered' | 'Received' | 'Closed';

export interface PurchaseOrderLineInput {
  part: string;
  qtyOrdered: number;
  qtyReceived?: number;
  backorderedQty?: number;
  price?: number;
}

export interface PurchaseOrderInput {
  vendorId: string;
  lines: PurchaseOrderLineInput[];
  poNumber?: string;
  expectedDate?: string;
  notes?: string;
}

export interface PurchaseOrderLine {
  _id?: string;
  part: string;
  qtyOrdered: number;
  qtyReceived?: number;
  backorderedQty?: number;
  price?: number;
}

export interface PurchaseOrderActivity {
  id: string;
  message: string;
  createdAt: string;
  actor?: string;
}

export interface PurchaseOrder {
  id: string;
  tenantId: string;
  siteId?: string;
  poNumber?: string;
  vendorId?: string;
  vendor?: Vendor;
  status: PurchaseOrderStatus;
  lines: PurchaseOrderLine[];
  createdAt?: string;
  updatedAt?: string;
  expectedDate?: string;
  notes?: string;
  activities?: PurchaseOrderActivity[];
}

export const createPurchaseOrder = (payload: PurchaseOrderInput) =>
  http.post<PurchaseOrder>('/purchase-orders', payload).then((res) => res.data);

export const updatePurchaseOrder = (id: string, payload: PurchaseOrderInput) =>
  http.put<PurchaseOrder>(`/purchase-orders/${id}`, payload).then((res) => res.data);

export const listPurchaseOrders = () =>
  http.get<PurchaseOrder[]>('/purchase-orders').then((res) => res.data);

export const fetchPurchaseOrder = (id: string) =>
  http.get<PurchaseOrder>(`/purchase-orders/${id}`).then((res) => res.data);

export const updatePurchaseOrderStatus = (
  id: string,
  payload: { status: PurchaseOrderStatus; receipts?: Array<{ part: string; quantity: number }> },
) => http.post<PurchaseOrder>(`/purchase-orders/${id}/status`, payload).then((res) => res.data);

export const createGoodsReceipt = (payload: Record<string, unknown>) =>
  http.post('/goods-receipts', payload).then((res) => res.data);
