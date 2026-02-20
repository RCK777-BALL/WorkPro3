/*
 * SPDX-License-Identifier: MIT
 */

import { useQuery } from '@tanstack/react-query';

import http from '@/lib/http';

export type AssetHistoryEntry = {
  id: string;
  date: string;
  title: string;
  status: string;
  duration?: number;
  notes?: string;
};

export type AssetDocumentSummary = {
  id: string;
  name?: string;
  type?: string;
  url: string;
  uploadedAt?: string;
  sizeBytes?: number;
};

export type AssetBomPart = {
  id: string;
  name: string;
  quantity: number;
  unitCost?: number;
  location?: string;
  partNumber?: string;
};

export type AssetPmTemplate = {
  templateId: string;
  assignmentId: string;
  title: string;
  interval: string;
  active: boolean;
  nextDue?: string;
  usageMetric?: string;
  usageTarget?: number;
};

export type AssetWorkOrderSummary = {
  id: string;
  title: string;
  status: string;
  priority: string;
  type: string;
  updatedAt?: string;
  dueDate?: string;
};

export type AssetDowntimeLog = {
  id: string;
  start: string;
  end?: string;
  reason?: string;
  durationMinutes: number;
};

export type AssetReliabilitySummary = {
  mttrHours: number;
  mtbfHours: number;
};

export type AssetMeter = {
  id: string;
  assetId: string;
  name: string;
  unit: string;
  currentValue: number;
  pmInterval: number;
  thresholds?: { warning?: number; critical?: number };
  updatedAt?: string;
  trend?: { timestamp: string; value: number }[];
};

export type AssetCostRollup = {
  total: number;
  maintenance: number;
  labor: number;
  parts: number;
  currency: string;
  timeframe: string;
  monthly: Array<{
    month: string;
    labor: number;
    parts: number;
    total: number;
  }>;
};

export type AssetDetailResponse = {
  asset: {
    id: string;
    tenantId: string;
    qrCode?: string;
    name: string;
    description?: string;
    status?: string;
    type?: string;
    criticality?: string;
    location?: string;
    serialNumber?: string;
    modelName?: string;
    manufacturer?: string;
    purchaseDate?: string;
    warrantyExpiry?: string;
    warrantyStart?: string;
    warrantyEnd?: string;
    purchaseCost?: number;
    expectedLifeMonths?: number;
    replacementDate?: string;
    installationDate?: string;
    siteId?: string;
    plantId?: string;
    departmentId?: string;
    lineId?: string;
    stationId?: string;
  };
  history: AssetHistoryEntry[];
  documents: AssetDocumentSummary[];
  bom: AssetBomPart[];
  pmTemplates: AssetPmTemplate[];
  openWorkOrders: AssetWorkOrderSummary[];
  costRollups: AssetCostRollup;
  downtimeLogs: AssetDowntimeLog[];
  reliability: AssetReliabilitySummary;
};

export const fetchAssetDetails = async (assetId: string): Promise<AssetDetailResponse> => {
  const res = await http.get<AssetDetailResponse>(`/assets/${assetId}/details`);
  return res.data;
};

export const assetKeys = {
  all: ['assets'] as const,
  detail: (assetId: string) => ['assets', 'detail', assetId] as const,
  meters: (assetId: string) => ['assets', 'meters', assetId] as const,
};

export const useAssetDetailsQuery = (assetId?: string) =>
  useQuery({
    queryKey: assetId ? assetKeys.detail(assetId) : [...assetKeys.all, 'detail'],
    queryFn: () => fetchAssetDetails(assetId ?? ''),
    enabled: Boolean(assetId),
    staleTime: 60_000,
  });

export const fetchAssetMeters = async (assetId: string): Promise<AssetMeter[]> => {
  const res = await http.get<AssetMeter[]>(`/assets/${assetId}/meters`);
  return res.data ?? [];
};

export const useAssetMetersQuery = (assetId?: string) =>
  useQuery({
    queryKey: assetId ? assetKeys.meters(assetId) : [...assetKeys.all, 'meters'],
    queryFn: () => fetchAssetMeters(assetId ?? ''),
    enabled: Boolean(assetId),
    staleTime: 60_000,
  });
