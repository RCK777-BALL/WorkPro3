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
