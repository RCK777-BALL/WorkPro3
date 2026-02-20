/*
 * SPDX-License-Identifier: MIT
 */

import { type AxiosRequestConfig } from 'axios';
import { useQuery } from '@tanstack/react-query';

import http from '@/lib/http';

export type DowntimeLog = {
  id: string;
  assetId: string;
  workOrderId?: string;
  start: string;
  end?: string;
  cause?: string;
  impact?: string;
  durationMinutes?: number;
  assetName?: string;
  workOrderTitle?: string;
};

export type DowntimeFilters = {
  assetId?: string;
  search?: string;
  start?: string;
  end?: string;
};

export type DowntimePayload = {
  assetId: string;
  workOrderId?: string;
  start: string;
  end: string;
  cause: string;
  impact: string;
};

const normalizeLog = (log: any): DowntimeLog => ({
  id: log._id ?? log.id,
  assetId: log.assetId,
  workOrderId: log.workOrderId,
  start: log.start,
  end: log.end,
  cause: log.cause ?? log.reason,
  impact: log.impact,
  durationMinutes:
    log.durationMinutes ??
    (log.start && log.end
      ? Math.max(0, (new Date(log.end).getTime() - new Date(log.start).getTime()) / 60000)
      : undefined),
  assetName: log.assetName,
  workOrderTitle: log.workOrderTitle,
});

export const listDowntimeLogs = async (filters: DowntimeFilters = {}): Promise<DowntimeLog[]> => {
  const config: AxiosRequestConfig = {};
  if (filters.assetId || filters.start || filters.end || filters.search) {
    config.params = {
      assetId: filters.assetId,
      start: filters.start,
      end: filters.end,
      q: filters.search,
    };
  }
  const res = await http.get('/downtime-logs', config);
  const raw = (res.data ?? []) as any[];
  return raw.map(normalizeLog);
};

export const createDowntimeLog = async (payload: DowntimePayload): Promise<DowntimeLog> => {
  const res = await http.post('/downtime-logs', payload);
  return normalizeLog(res.data);
};

export const updateDowntimeLog = async (
  id: string,
  payload: DowntimePayload,
): Promise<DowntimeLog> => {
  const res = await http.put(`/downtime-logs/${id}`, payload);
  return normalizeLog(res.data);
};

export const deleteDowntimeLog = async (id: string): Promise<void> => {
  await http.delete(`/downtime-logs/${id}`);
};

export type DowntimeAssetOption = { id: string; name: string };
export type DowntimeWorkOrderOption = { id: string; title: string; assetId?: string };

export const fetchDowntimeAssets = async (): Promise<DowntimeAssetOption[]> => {
  const res = await http.get('/assets', { params: { limit: 200, fields: 'id,name' } });
  const items = (res.data ?? []) as any[];
  return items.map((item) => ({ id: item._id ?? item.id, name: item.name ?? 'Unnamed asset' }));
};

export const fetchDowntimeWorkOrders = async (): Promise<DowntimeWorkOrderOption[]> => {
  const res = await http.get('/workorders', { params: { limit: 200, fields: 'id,title,assetId' } });
  const items = (res.data ?? []) as any[];
  return items.map((item) => ({
    id: item._id ?? item.id,
    title: item.title ?? 'Untitled work order',
    assetId: item.asset ?? item.assetId,
  }));
};

export const downtimeKeys = {
  all: ['downtime-logs'] as const,
  filters: (filters: DowntimeFilters) => ['downtime-logs', filters] as const,
  assets: ['downtime-assets'] as const,
  workOrders: ['downtime-workorders'] as const,
};

export const useDowntimeLogsQuery = (filters: DowntimeFilters = {}) =>
  useQuery({
    queryKey: downtimeKeys.filters(filters),
    queryFn: () => listDowntimeLogs(filters),
    staleTime: 30_000,
  });

export const useDowntimeAssetsQuery = () =>
  useQuery({ queryKey: downtimeKeys.assets, queryFn: fetchDowntimeAssets, staleTime: 60_000 });

export const useDowntimeWorkOrdersQuery = () =>
  useQuery({ queryKey: downtimeKeys.workOrders, queryFn: fetchDowntimeWorkOrders, staleTime: 60_000 });
