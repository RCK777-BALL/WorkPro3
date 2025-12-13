/*
 * SPDX-License-Identifier: MIT
 */

import http from '@/lib/http';
import { safeLocalStorage } from './safeLocalStorage';

export type ScanEntityType = 'asset' | 'workOrder' | 'location' | 'part';

export interface ScanResolution {
  type: ScanEntityType;
  id: string;
  path: string;
  raw: string;
  label?: string;
}

export interface ScanFailure {
  error: string;
  raw: string;
}

export interface ScanLookupSources {
  cachedWorkOrders?: Array<{ id?: string | null }>;
  cachedAssets?: Array<{ id?: string | null }>;
  cachedLocations?: Array<{ id?: string | null }>;
  cachedParts?: Array<{ id?: string | null }>;
}

export interface ScanNavigationLogEntry {
  outcome: 'success' | 'failure';
  resolution?: ScanResolution;
  error?: string;
  source?: string;
  timestamp?: string;
}

const STORAGE_KEY = 'scan-navigation-log';

const normalizeType = (value?: string | null): ScanEntityType | undefined => {
  if (!value) return undefined;
  const normalized = value.toLowerCase();
  if (normalized === 'asset') return 'asset';
  if (normalized === 'workorder' || normalized === 'work-order' || normalized === 'wo') return 'workOrder';
  if (normalized === 'location' || normalized === 'site-location') return 'location';
  if (normalized === 'part' || normalized === 'inventory') return 'part';
  return undefined;
};

const buildPath = (type: ScanEntityType, id: string): string => {
  switch (type) {
    case 'asset':
      return `/assets/${id}`;
    case 'workOrder':
      return `/work-orders/${id}`;
    case 'location':
      return `/locations/${id}`;
    case 'part':
      return `/parts/${id}`;
    default:
      return '/';
  }
};

const coerceId = (value?: unknown): string | undefined => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  }
  return undefined;
};

export const parseScanPayload = (raw: string): ScanResolution | ScanFailure => {
  const normalizedRaw = raw.trim();
  try {
    const payload = JSON.parse(normalizedRaw) as {
      type?: string;
      entityType?: string;
      id?: string;
      assetId?: string;
      workOrderId?: string;
      locationId?: string;
      partId?: string;
      code128?: string;
    };

    const decoded = payload.code128 ?? payload.id ?? payload.assetId ?? payload.workOrderId ?? payload.locationId ?? payload.partId;
    const type = normalizeType(payload.type ?? payload.entityType);
    if (type && decoded) {
      return { type, id: decoded, raw: normalizedRaw, path: buildPath(type, decoded) };
    }
    if (payload.assetId) {
      return { type: 'asset', id: payload.assetId, raw: normalizedRaw, path: buildPath('asset', payload.assetId) };
    }
    if (payload.workOrderId) {
      return {
        type: 'workOrder',
        id: payload.workOrderId,
        raw: normalizedRaw,
        path: buildPath('workOrder', payload.workOrderId),
      };
    }
    if (payload.locationId) {
      return {
        type: 'location',
        id: payload.locationId,
        raw: normalizedRaw,
        path: buildPath('location', payload.locationId),
      };
    }
    if (payload.partId) {
      return { type: 'part', id: payload.partId, raw: normalizedRaw, path: buildPath('part', payload.partId) };
    }
  } catch {
    // Not JSON – continue to pattern parsing
  }

  const patternMatch = /^([a-z-]+)[\s:/-](.+)$/i.exec(normalizedRaw);
  if (patternMatch) {
    const type = normalizeType(patternMatch[1]);
    const id = coerceId(patternMatch[2]);
    if (type && id) {
      return { type, id, raw: normalizedRaw, path: buildPath(type, id) };
    }
  }

  const lower = normalizedRaw.toLowerCase();
  if (lower.startsWith('wo-') || lower.startsWith('wo')) {
    const id = normalizedRaw.replace(/^wo[-:/]?/i, '');
    return { type: 'workOrder', id, raw: normalizedRaw, path: buildPath('workOrder', id) };
  }

  if (lower.startsWith('part-')) {
    const id = normalizedRaw.replace(/^part[-:/]?/i, '');
    return { type: 'part', id, raw: normalizedRaw, path: buildPath('part', id) };
  }

  if (lower.startsWith('loc-') || lower.startsWith('location-')) {
    const id = normalizedRaw.replace(/^(loc|location)[-:/]?/i, '');
    return { type: 'location', id, raw: normalizedRaw, path: buildPath('location', id) };
  }

  // Default to asset when only an ID is present
  if (normalizedRaw) {
    return { type: 'asset', id: normalizedRaw, raw: normalizedRaw, path: buildPath('asset', normalizedRaw) };
  }

  return { error: 'No scan data was detected.', raw: normalizedRaw };
};

const existsInCache = (resolution: ScanResolution, sources?: ScanLookupSources): boolean => {
  const id = resolution.id;
  if (!sources) return false;
  if (resolution.type === 'workOrder') {
    return Boolean(sources.cachedWorkOrders?.some((item) => item.id === id));
  }
  if (resolution.type === 'asset') {
    return Boolean(sources.cachedAssets?.some((item) => item.id === id));
  }
  if (resolution.type === 'location') {
    return Boolean(sources.cachedLocations?.some((item) => item.id === id));
  }
  if (resolution.type === 'part') {
    return Boolean(sources.cachedParts?.some((item) => item.id === id));
  }
  return false;
};

export const confirmEntityExists = async (
  resolution: ScanResolution,
  sources?: ScanLookupSources,
): Promise<boolean> => {
  if (existsInCache(resolution, sources)) return true;

  try {
    switch (resolution.type) {
      case 'asset':
        await http.get(`/assets/${resolution.id}`);
        return true;
      case 'workOrder':
        await http.get(`/workorders/${resolution.id}`);
        return true;
      case 'location':
        await http.get(`/inventory/v2/locations/${resolution.id}`);
        return true;
      case 'part':
        await http.get(`/inventory/v2/parts/${resolution.id}`);
        return true;
      default:
        return false;
    }
  } catch {
    return false;
  }
};

export const logScanNavigationOutcome = (entry: ScanNavigationLogEntry): void => {
  const existing = safeLocalStorage.getItem(STORAGE_KEY);
  let parsed: ScanNavigationLogEntry[] = [];
  if (existing) {
    try {
      parsed = JSON.parse(existing) as ScanNavigationLogEntry[];
    } catch {
      parsed = [];
    }
  }
  const nextEntry = { ...entry, timestamp: entry.timestamp ?? new Date().toISOString() };
  parsed.unshift(nextEntry);
  const trimmed = parsed.slice(0, 50);
  safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
};

