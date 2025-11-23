/*
 * SPDX-License-Identifier: MIT
 */

import http from '@/lib/http';

import type { AuditLogFilters, AuditLogPage } from './types';

const normalizeDateParam = (value?: string, endOfDay = false): string | undefined => {
  if (!value) return undefined;
  const suffix = endOfDay ? 'T23:59:59.999Z' : 'T00:00:00.000Z';
  return `${value}${value.includes('T') ? '' : suffix}`;
};

const buildParams = (filters: AuditLogFilters, cursor?: string) => {
  const params: Record<string, string> = { limit: String(filters.limit ?? 50) };
  if (filters.entityType) params.entityType = filters.entityType;
  if (filters.action) params.action = filters.action;
  if (filters.actor) params.actor = filters.actor;
  if (filters.entityId) params.entityId = filters.entityId;
  if (filters.siteId) params.siteId = filters.siteId;
  const start = normalizeDateParam(filters.start);
  const end = normalizeDateParam(filters.end, true);
  if (start) params.start = start;
  if (end) params.end = end;
  if (cursor) params.cursor = cursor;
  return params;
};

export async function fetchAuditLogs(filters: AuditLogFilters, cursor?: string): Promise<AuditLogPage> {
  const params = buildParams(filters, cursor);
  const response = await http.get<AuditLogPage>('/audit', { params });
  return response.data;
}

export async function fetchEntityAuditLogs(
  entityType: string,
  entityId?: string,
  options?: { siteId?: string; limit?: number },
): Promise<AuditLogPage> {
  const params = buildParams({
    entityType,
    entityId,
    siteId: options?.siteId,
    limit: options?.limit ?? 20,
  });
  const response = await http.get<AuditLogPage>('/audit', { params });
  return response.data;
}

export async function exportAuditLogs(filters: AuditLogFilters): Promise<Blob> {
  const params = buildParams(filters);
  const response = await http.get<Blob>('/audit/export', {
    params,
    responseType: 'blob',
  });
  return response.data;
}
