/*
 * SPDX-License-Identifier: MIT
 */

export type PurchaseOrderStatus = 'draft' | 'pending' | 'approved' | 'received';

export interface PurchaseOrderItemPayload {
  partId: string;
  quantity: number;
  unitCost?: number | undefined;
}

export interface PurchaseOrderPayload {
  vendorId: string;
  items: PurchaseOrderItemPayload[];
  status?: PurchaseOrderStatus | undefined;
}

export interface PurchaseOrderItem {
  partId: string;
  quantity: number;
  unitCost?: number | undefined;
  received: number;
  status: 'open' | 'partial' | 'received';
}

export interface PurchaseOrder {
  id: string;
  vendorId: string;
  status: PurchaseOrderStatus;
  items: PurchaseOrderItem[];
  totalCost: number;
  createdAt: string;
  updatedAt?: string | undefined;
}

export interface ReceiptLine {
  partId: string;
  quantity: number;
}
