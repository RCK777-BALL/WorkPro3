/*
 * SPDX-License-Identifier: MIT
 */

import http from '@/lib/http';
import type { Vendor } from '@/types/vendor';

export type PurchaseOrderStatus =
  | 'draft'
  | 'sent'
  | 'partially_received'
  | 'received'
  | 'closed'
  | 'canceled';

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
  status?: PurchaseOrderStatus;
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
  tenantId?: string;
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

interface BackendPurchaseOrderItem {
  partId: string;
  quantity: number;
  unitCost?: number;
  received: number;
  status?: string;
}

interface BackendPurchaseOrderAuditEntry {
  action: string;
  at: string;
  userId?: string;
  note?: string;
}

interface BackendPurchaseOrder {
  id: string;
  tenantId?: string;
  siteId?: string;
  vendorId: string;
  status: PurchaseOrderStatus;
  items: BackendPurchaseOrderItem[];
  notes?: string;
  auditTrail?: BackendPurchaseOrderAuditEntry[];
  createdAt?: string;
  updatedAt?: string;
}

const auditMessage = (entry: BackendPurchaseOrderAuditEntry): string => {
  const base = {
    create: 'Purchase order created',
    update: 'Purchase order updated',
    send: 'Purchase order sent',
    receive: 'Goods received',
    close: 'Purchase order closed',
    cancel: 'Purchase order canceled',
  }[entry.action] ?? 'Purchase order updated';

  return entry.note ? `${base}: ${entry.note}` : base;
};

const mapPurchaseOrder = (order: BackendPurchaseOrder): PurchaseOrder => ({
  id: order.id,
  tenantId: order.tenantId,
  siteId: order.siteId,
  vendorId: order.vendorId,
  status: order.status,
  lines: (order.items ?? []).map((item) => ({
    part: item.partId,
    qtyOrdered: item.quantity,
    qtyReceived: item.received,
    price: item.unitCost,
  })),
  notes: order.notes,
  createdAt: order.createdAt,
  updatedAt: order.updatedAt,
  activities: order.auditTrail?.map((entry, index) => ({
    id: `${order.id}-${index}`,
    message: auditMessage(entry),
    createdAt: entry.at,
    actor: entry.userId,
  })),
});

const normalizeLines = (lines: PurchaseOrderLineInput[]) =>
  lines
    .filter((line) => line.part && line.qtyOrdered > 0)
    .map((line) => ({
      partId: line.part,
      quantity: line.qtyOrdered,
      unitCost: line.price ?? undefined,
    }));

export const createPurchaseOrder = async (payload: PurchaseOrderInput) => {
  const normalized = {
    vendorId: payload.vendorId,
    notes: payload.notes,
    status: payload.status,
    items: normalizeLines(payload.lines),
  };
  const res = await http.post<BackendPurchaseOrder>('/purchase-orders', normalized);
  return mapPurchaseOrder(res.data);
};

export const updatePurchaseOrder = async (id: string, payload: PurchaseOrderInput) => {
  const normalized = {
    vendorId: payload.vendorId,
    notes: payload.notes,
    status: payload.status,
    items: normalizeLines(payload.lines),
  };
  const res = await http.put<BackendPurchaseOrder>(`/purchase-orders/${id}`, normalized);
  return mapPurchaseOrder(res.data);
};

export const listPurchaseOrders = async () => {
  const res = await http.get<BackendPurchaseOrder[]>('/purchase-orders');
  return res.data.map(mapPurchaseOrder);
};

export const fetchPurchaseOrder = async (id: string) => {
  const res = await http.get<BackendPurchaseOrder>(`/purchase-orders/${id}`);
  return mapPurchaseOrder(res.data);
};

export const updatePurchaseOrderStatus = async (
  id: string,
  payload: { status?: PurchaseOrderStatus; receipts?: Array<{ part: string; quantity: number }> },
) => {
  if (payload.receipts?.length) {
    const res = await http.post<BackendPurchaseOrder>(`/purchase-orders/${id}/receive`, {
      receipts: payload.receipts.map((receipt) => ({
        partId: receipt.part,
        quantity: receipt.quantity,
      })),
    });
    return mapPurchaseOrder(res.data);
  }
  if (!payload.status) {
    throw new Error('Status is required when no receipts are provided.');
  }
  const res = await http.post<BackendPurchaseOrder>(`/purchase-orders/${id}/status`, {
    status: payload.status,
  });
  return mapPurchaseOrder(res.data);
};

export const createGoodsReceipt = (payload: Record<string, unknown>) =>
  http.post('/goods-receipts', payload).then((res) => res.data);
