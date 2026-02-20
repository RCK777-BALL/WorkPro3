/*
 * SPDX-License-Identifier: MIT
 */

import { useQuery } from '@tanstack/react-query';

import http from '@/lib/http';

export type MaintenanceMetrics = {
  mttr: number;
  mtbf: number;
  backlog: number;
  pmCompliance: { total: number; completed: number; percentage: number };
  range: { start?: string; end?: string };
};

export type MaintenanceMetricsFilters = {
  startDate?: string;
  endDate?: string;
  assetIds?: string[];
  siteIds?: string[];
};

const buildParams = (filters: MaintenanceMetricsFilters = {}) => {
  const params: Record<string, string> = {};
  if (filters.startDate) params.startDate = filters.startDate;
  if (filters.endDate) params.endDate = filters.endDate;
  if (filters.assetIds?.length) params.assetIds = filters.assetIds.join(',');
  if (filters.siteIds?.length) params.siteIds = filters.siteIds.join(',');
  return params;
};

export const fetchMaintenanceMetrics = async (
  filters: MaintenanceMetricsFilters = {},
): Promise<MaintenanceMetrics> => {
  const res = await http.get('/analytics/maintenance', { params: buildParams(filters) });
  return res.data;
};

export const exportMaintenanceMetrics = async (
  format: 'csv' | 'xlsx',
  filters: MaintenanceMetricsFilters = {},
): Promise<Blob> => {
  const res = await http.get(`/analytics/maintenance.${format}`, {
    params: buildParams(filters),
    responseType: 'blob',
  });
  return res.data;
};

export const maintenanceMetricsKeys = {
  all: ['maintenance-metrics'] as const,
  filters: (filters: MaintenanceMetricsFilters) => ['maintenance-metrics', filters] as const,
};

export const useMaintenanceMetricsQuery = (filters: MaintenanceMetricsFilters = {}) =>
  useQuery({
    queryKey: maintenanceMetricsKeys.filters(filters),
    queryFn: () => fetchMaintenanceMetrics(filters),
    staleTime: 60_000,
  });
