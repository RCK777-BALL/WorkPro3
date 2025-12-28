/*
 * SPDX-License-Identifier: MIT
 */

import http from '@/lib/http';
import type {
  InventoryAlert,
  InventoryLocation,
  PaginatedResult,
  Part,
  ReorderAlertStatus,
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

const normalizePartsResult = (
  payload: PaginatedResult<Part> | Part[],
  params: PartQueryParams,
): PaginatedResult<Part> => {
  if (!Array.isArray(payload)) {
    return payload;
  }

  const searchTerm = params.search?.trim().toLowerCase();
  let items = payload;

  if (searchTerm) {
    items = items.filter((part) => {
      const vendorName = part.vendor?.name ?? '';
      const partNo = part.partNo ?? part.partNumber ?? '';
      return [part.name, partNo, vendorName].some((value) => value.toLowerCase().includes(searchTerm));
    });
  }

  if (params.vendorId) {
    items = items.filter((part) => part.vendor?.id === params.vendorId);
  }

  if (params.sortBy) {
    const direction = params.sortDirection === 'desc' ? -1 : 1;
    items = [...items].sort((a, b) => {
      const resolveValue = (part: Part) => {
        if (params.sortBy === 'vendor') {
          return part.vendor?.name ?? '';
        }
        return (part as Record<string, unknown>)[params.sortBy ?? ''] ?? '';
      };
      const aValue = resolveValue(a);
      const bValue = resolveValue(b);
      return String(aValue).localeCompare(String(bValue)) * direction;
    });
  }

  const pageSize = params.pageSize ?? items.length || 1;
  const page = Math.max(1, params.page ?? 1);
  const start = (page - 1) * pageSize;
  const paginated = items.slice(start, start + pageSize);

  return {
    items: paginated,
    page,
    pageSize,
    total: items.length,
    totalPages: Math.max(1, Math.ceil(items.length / pageSize)),
  };
};

export const fetchParts = async (params: PartQueryParams = {}): Promise<PaginatedResult<Part>> => {
  const res = await http.get<PaginatedResult<Part> | Part[]>(`${BASE_PATH}/parts`, { params });
  return normalizePartsResult(res.data, params);
};

export const fetchPart = async (partId: string): Promise<Part> => {
  const res = await http.get<Part>(`${BASE_PATH}/parts/${partId}`);
  return res.data;
};

export const upsertPart = async (payload: Partial<Part> & { name: string; id?: string }): Promise<Part> => {
  const normalized = payload.barcode ? { ...payload, barcode: payload.barcode.trim() } : payload;
  if (normalized.id) {
    const res = await http.put<Part>(`${BASE_PATH}/parts/${normalized.id}`, normalized);
    return res.data;
  }
  const res = await http.post<Part>(`${BASE_PATH}/parts`, normalized);
  return res.data;
};

export const fetchVendors = async (): Promise<VendorSummary[]> => {
  const res = await http.get<VendorSummary[]>(`${BASE_PATH}/vendors`);
  return res.data;
};

export interface ReorderAlertQueryParams {
  status?: ReorderAlertStatus;
  page?: number;
  pageSize?: number;
  siteId?: string;
  partId?: string;
}

export interface ReorderAlertResult extends PaginatedResult<InventoryAlert> {
  openCount: number;
}

export const fetchInventoryAlerts = async (
  params: ReorderAlertQueryParams = { status: 'open' },
): Promise<ReorderAlertResult> => {
  const res = await http.get<ReorderAlertResult>(`${BASE_PATH}/alerts`, { params });
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
  payload: { status: PurchaseOrder['status']; receipts?: Array<{ partId: string; quantity: number }> },
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
  const normalized = payload.barcode ? { ...payload, barcode: payload.barcode.trim() } : payload;
  if (normalized.id) {
    const res = await http.put<InventoryLocation>(`${BASE_PATH}/locations/${normalized.id}`, normalized);
    return res.data;
  }
  const res = await http.post<InventoryLocation>(`${BASE_PATH}/locations`, normalized);
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
