/*
 * SPDX-License-Identifier: MIT
 */

import { type AxiosRequestConfig } from 'axios';
import { useQuery } from '@tanstack/react-query';

import http from '@/lib/http';

export type DowntimeEvent = {
  id: string;
  assetId: string;
  workOrderId?: string;
  start: string;
  end?: string;
  causeCode: string;
  reason: string;
  impactMinutes?: number;
};

export type DowntimeEventFilters = {
  assetId?: string;
  workOrderId?: string;
  activeOnly?: boolean;
  start?: string;
  end?: string;
  causeCode?: string;
};

const normalizeEvent = (event: any): DowntimeEvent => ({
  id: event._id ?? event.id,
  assetId: event.assetId,
  workOrderId: event.workOrderId,
  start: event.start,
  end: event.end,
  causeCode: event.causeCode,
  reason: event.reason,
  impactMinutes: event.impactMinutes,
});

const buildParams = (filters: DowntimeEventFilters = {}) => {
  const params: Record<string, string> = {};
  if (filters.assetId) params.assetId = filters.assetId;
  if (filters.workOrderId) params.workOrderId = filters.workOrderId;
  if (typeof filters.activeOnly === 'boolean') params.activeOnly = String(filters.activeOnly);
  if (filters.start) params.start = filters.start;
  if (filters.end) params.end = filters.end;
  if (filters.causeCode) params.causeCode = filters.causeCode;
  return params;
};

export const listDowntimeEvents = async (filters: DowntimeEventFilters = {}): Promise<DowntimeEvent[]> => {
  const config: AxiosRequestConfig = { params: buildParams(filters) };
  const res = await http.get('/downtime-events', config);
  const raw = (res.data ?? []) as any[];
  return raw.map(normalizeEvent);
};

export const exportDowntimeEvents = async (
  format: 'csv' | 'xlsx',
  filters: DowntimeEventFilters = {},
): Promise<Blob> => {
  const res = await http.get(`/downtime-events/export.${format}`, {
    params: buildParams(filters),
    responseType: 'blob',
  });
  return res.data;
};

export const downtimeEventKeys = {
  all: ['downtime-events'] as const,
  filters: (filters: DowntimeEventFilters) => ['downtime-events', filters] as const,
};

export const useDowntimeEventsQuery = (filters: DowntimeEventFilters = {}) =>
  useQuery({
    queryKey: downtimeEventKeys.filters(filters),
    queryFn: () => listDowntimeEvents(filters),
    staleTime: 30_000,
  });
