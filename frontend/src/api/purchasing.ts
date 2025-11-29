/*
 * SPDX-License-Identifier: MIT
 */

import http from '@/lib/http';
import type { Vendor } from '@/types/vendor';

export type PurchaseOrderStatus = 'Draft' | 'Pending' | 'Approved' | 'Ordered' | 'Received' | 'Closed';

export interface PurchaseOrderLineInput {
  part: string;
  qtyOrdered: number;
  price?: number;
}

export interface PurchaseOrderInput {
  vendorId: string;
  lines: PurchaseOrderLineInput[];
  poNumber?: string;
}

export interface PurchaseOrderLine {
  _id?: string;
  part: string;
  qtyOrdered: number;
  qtyReceived?: number;
  price?: number;
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
}

export const createPurchaseOrder = (payload: PurchaseOrderInput) =>
  http.post<PurchaseOrder>('/purchase-orders', payload).then((res) => res.data);

export const listPurchaseOrders = () =>
  http.get<PurchaseOrder[]>('/purchase-orders').then((res) => res.data);

export const updatePurchaseOrderStatus = (id: string, status: PurchaseOrderStatus) =>
  http.post<PurchaseOrder>(`/purchase-orders/${id}/status`, { status }).then((res) => res.data);

export const createGoodsReceipt = (payload: Record<string, unknown>) =>
  http.post('/goods-receipts', payload).then((res) => res.data);
