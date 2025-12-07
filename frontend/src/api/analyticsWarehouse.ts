/*
 * SPDX-License-Identifier: MIT
 */

import http from '@/lib/http';

export interface Snapshot {
  period: string;
  granularity: 'day' | 'month';
  siteId?: string;
  siteName?: string;
  assetId?: string;
  assetName?: string;
  technicianId?: string;
  technicianName?: string;
  mtbfHours: number;
  mttrHours: number;
  responseSlaRate: number;
  resolutionSlaRate: number;
  technicianUtilization: number;
  downtimeHours: number;
  maintenanceCost: number;
}

export interface SnapshotResponse {
  snapshots: Snapshot[];
  generatedAt: string;
  preview?: boolean;
  rebuilt?: boolean;
}

export interface LeaderboardEntry {
  id?: string;
  label: string;
  downtimeHours: number;
  mttrHours: number;
  maintenanceCost: number;
  responseSlaRate?: number;
  resolutionSlaRate?: number;
  technicianUtilization?: number;
}

export interface LeaderboardResponse {
  sites: LeaderboardEntry[];
  assets: LeaderboardEntry[];
  technicians: LeaderboardEntry[];
}

export interface ComparisonRow {
  siteId?: string;
  siteName?: string;
  downtimeHours: number;
  maintenanceCost: number;
  mtbfHours: number;
  mttrHours: number;
  responseSlaRate: number;
  resolutionSlaRate: number;
}

export interface ComparisonResponse {
  range: { from: string; to: string; granularity: 'day' | 'month' };
  comparisons: ComparisonRow[];
}

interface QueryParams {
  from?: string;
  to?: string;
  granularity?: 'day' | 'month';
  scope?: 'site' | 'asset' | 'technician' | 'overall';
}

export const fetchSnapshots = async (params: QueryParams): Promise<SnapshotResponse> => {
  const response = await http.get<SnapshotResponse>('/analytics/v2/metrics', { params });
  return response.data;
};

export const fetchLeaderboards = async (params: QueryParams): Promise<LeaderboardResponse> => {
  const response = await http.get<LeaderboardResponse>('/analytics/v2/metrics/leaderboard', { params });
  return response.data;
};

export const fetchComparisons = async (params: QueryParams): Promise<ComparisonResponse> => {
  const response = await http.get<ComparisonResponse>('/analytics/v2/metrics/comparisons', { params });
  return response.data;
};

export const rebuildSnapshots = async (months: number): Promise<SnapshotResponse> => {
  const response = await http.post<SnapshotResponse>('/analytics/v2/metrics/rebuild', { months });
  return response.data;
};

export interface MetricsRollupFilters {
  startDate?: string;
  endDate?: string;
  siteIds?: string[];
  lineIds?: string[];
  assetIds?: string[];
  granularity?: 'day' | 'month';
}

export interface MetricsRollupBreakdownRow {
  scope: 'tenant' | 'site' | 'line' | 'asset';
  id?: string;
  name?: string;
  workOrders: number;
  completedWorkOrders: number;
  mttrHours: number;
  mtbfHours: number;
  pmCompleted: number;
  pmTotal: number;
  pmCompliance: number;
  downtimeMinutes: number;
}

export interface MetricsRollupSummaryResponse {
  range: { start?: string; end?: string; granularity: 'day' | 'month' };
  totals: MetricsRollupBreakdownRow;
  breakdown: MetricsRollupBreakdownRow[];
  availableFilters: {
    sites: Array<{ id: string; name?: string }>;
    lines: Array<{ id: string; name?: string; siteId?: string }>;
    assets: Array<{ id: string; name?: string; siteId?: string; lineId?: string }>;
  };
}

export interface MetricsRollupDetailRow {
  id: string;
  title: string;
  status: string;
  type: string;
  priority?: string;
  createdAt?: string;
  completedAt?: string;
  downtimeMinutes?: number;
  timeSpentMinutes?: number;
  assetId?: string;
  assetName?: string;
  siteId?: string;
  siteName?: string;
  lineId?: string;
  lineName?: string;
  pmTaskId?: string;
  pmTaskTitle?: string;
}

export interface MetricsRollupDetailsResponse {
  workOrders: MetricsRollupDetailRow[];
}

export const fetchMetricsRollups = async (
  params: MetricsRollupFilters,
): Promise<MetricsRollupSummaryResponse> => {
  const response = await http.get<MetricsRollupSummaryResponse>('/analytics/v2/metrics/rollups', {
    params,
  });
  return response.data;
};

export const fetchMetricsRollupDetails = async (
  params: MetricsRollupFilters,
): Promise<MetricsRollupDetailsResponse> => {
  const response = await http.get<MetricsRollupDetailsResponse>('/analytics/v2/metrics/rollups/details', {
    params,
  });
  return response.data;
};

export const exportMetricsRollupCsv = async (params: MetricsRollupFilters): Promise<Blob> => {
  const response = await http.get('/analytics/v2/metrics/rollups.csv', {
    params,
    responseType: 'blob',
  });
  return response.data as Blob;
};

export const exportMetricsRollupPdf = async (params: MetricsRollupFilters): Promise<Blob> => {
  const response = await http.get('/analytics/v2/metrics/rollups.pdf', {
    params,
    responseType: 'blob',
  });
  return response.data as Blob;
};
