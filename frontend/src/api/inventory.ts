/*
 * SPDX-License-Identifier: MIT
 */

import http from '@/lib/http';
import type {
  InventoryAlert,
  InventoryLocation,
  PaginatedResult,
  Part,
  PurchaseOrder,
  PurchaseOrderPayload,
  PartUsageReport,
  SortDirection,
  StockAdjustment,
  StockHistoryEntry,
  StockItem,
  InventoryTransfer,
  InventoryTransferPayload,
  VendorSummary,
} from '@/types';

const BASE_PATH = '/inventory/v2';

export interface PartQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  vendorId?: string;
  sortBy?: string;
  sortDirection?: SortDirection;
}

export const fetchParts = async (params: PartQueryParams = {}): Promise<PaginatedResult<Part>> => {
  const res = await http.get<PaginatedResult<Part>>(`${BASE_PATH}/parts`, { params });
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

export const fetchPurchaseOrders = async (): Promise<PurchaseOrder[]> => {
  const res = await http.get<PurchaseOrder[]>(`${BASE_PATH}/purchase-orders`);
  return res.data;
};

export const updatePurchaseOrderStatus = async (
  purchaseOrderId: string,
  payload: { status: 'pending' | 'approved' | 'ordered' | 'received' | 'closed'; receipts?: Array<{ partId: string; quantity: number }>; },
): Promise<PurchaseOrder> => {
  const res = await http.post<PurchaseOrder>(`${BASE_PATH}/purchase-orders/${purchaseOrderId}/status`, payload);
  return res.data;
};

const extractFileName = (value?: string): string | undefined => {
  if (!value) return undefined;
  const match = /filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i.exec(value);
  if (!match) return undefined;
  return decodeURIComponent(match[1] ?? match[2] ?? '').replace(/\/+/, '');
};

export type InventoryExportFormat = 'csv' | 'pdf';

export interface FileExportDownload {
  data: ArrayBuffer;
  fileName: string;
  mimeType: string;
}

export const downloadPurchaseOrderExport = async (
  format: InventoryExportFormat,
  purchaseOrderId?: string,
): Promise<FileExportDownload> => {
  const res = await http.get<ArrayBuffer>(`${BASE_PATH}/purchase-orders/export`, {
    params: { format, purchaseOrderId },
    responseType: 'arraybuffer',
  });
  const fileName =
    extractFileName((res.headers['content-disposition'] as string | undefined) ?? undefined) ??
    `purchase-orders.${format === 'pdf' ? 'pdf' : 'csv'}`;
  const mimeType = (res.headers['content-type'] as string | undefined) ??
    (format === 'pdf' ? 'application/pdf' : 'text/csv');
  return { data: res.data, fileName, mimeType };
};

export interface InventoryExportParams extends PartQueryParams {
  reportingColumns?: string[];
}

export const downloadInventoryExport = async (
  format: InventoryExportFormat,
  params: InventoryExportParams = {},
): Promise<FileExportDownload> => {
  const res = await http.get<ArrayBuffer>('/inventory/export', {
    params: { format, ...params },
    responseType: 'arraybuffer',
  });

  const fileName =
    extractFileName((res.headers['content-disposition'] as string | undefined) ?? undefined) ??
    `inventory.${format === 'pdf' ? 'pdf' : 'csv'}`;
  const mimeType =
    (res.headers['content-type'] as string | undefined) ?? (format === 'pdf' ? 'application/pdf' : 'text/csv');

  return { data: res.data, fileName, mimeType };
};

export const fetchLocations = async (): Promise<InventoryLocation[]> => {
  const res = await http.get<InventoryLocation[]>(`${BASE_PATH}/locations`);
  return res.data;
};

export const upsertLocation = async (
  payload: Partial<InventoryLocation> & { store: string; id?: string },
): Promise<InventoryLocation> => {
  if (payload.id) {
    const res = await http.put<InventoryLocation>(`${BASE_PATH}/locations/${payload.id}`, payload);
    return res.data;
  }
  const res = await http.post<InventoryLocation>(`${BASE_PATH}/locations`, payload);
  return res.data;
};

export const fetchStockItems = async (): Promise<StockItem[]> => {
  const res = await http.get<StockItem[]>(`${BASE_PATH}/stock`);
  return res.data;
};

export const adjustStockLevel = async (payload: {
  stockItemId: string;
  delta: number;
  reason?: string;
}): Promise<StockAdjustment> => {
  const res = await http.post<StockAdjustment>(`${BASE_PATH}/stock/adjust`, payload);
  return res.data;
};

export const fetchStockHistory = async (): Promise<StockHistoryEntry[]> => {
  const res = await http.get<StockHistoryEntry[]>(`${BASE_PATH}/stock/history`);
  return res.data;
};

export const fetchPartUsageReport = async (): Promise<PartUsageReport> => {
  const res = await http.get<PartUsageReport>(`${BASE_PATH}/analytics/usage`);
  return res.data;
};

export const transferInventory = async (
  payload: InventoryTransferPayload,
): Promise<InventoryTransfer> => {
  const res = await http.post<InventoryTransfer>(`${BASE_PATH}/transfers`, payload);
  return res.data;
};
