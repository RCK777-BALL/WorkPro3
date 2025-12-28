/*
 * SPDX-License-Identifier: MIT
 */

import type { Part, VendorSummary } from '@/types';
import { TENANT_KEY } from '@/lib/http';
import { safeLocalStorage } from '@/utils/safeLocalStorage';

type MaybeDate = string | Date | null | undefined;

type InventoryApiItem = {
  _id?: string;
  id?: string;
  name?: unknown;
  description?: unknown;
  category?: unknown;
  sku?: unknown;
  partNumber?: unknown;
  location?: unknown;
  quantity?: unknown;
  unitCost?: unknown;
  reorderPoint?: unknown;
  reorderThreshold?: unknown;
  lastRestockDate?: MaybeDate;
  lastOrderDate?: MaybeDate;
  vendor?: unknown;
  image?: unknown;
};

const toNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toOptionalString = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  }
  return undefined;
};

const toDateInput = (value: MaybeDate): string => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.valueOf())) return '';
  return date.toISOString().split('T')[0] ?? '';
};

const resolveVendor = (value: unknown): VendorSummary | undefined => {
  if (!value) return undefined;
  if (typeof value === 'string') {
    return { id: value, name: value };
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const candidate = obj.id ?? obj._id;
    const name = typeof obj.name === 'string' ? obj.name : undefined;
    if (typeof candidate === 'string') {
      return { id: candidate, name: name ?? candidate };
    }
    if (name) {
      return { id: name, name };
    }
  }
  return undefined;
};

export const normalizeInventoryItem = (item: InventoryApiItem): Part => {
  const resolvedId = toOptionalString(item.id) ?? toOptionalString(item._id);
  const fallbackId =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  const id = resolvedId ?? fallbackId;
  const tenantId = safeLocalStorage.getItem(TENANT_KEY) ?? 'unknown-tenant';
  const name = toOptionalString(item.name) ?? '';
  const sku = toOptionalString(item.sku) ?? toOptionalString(item.partNumber) ?? '';

  return {
    id,
    tenantId,
    name,
    description: toOptionalString(item.description),
    category: toOptionalString(item.category) ?? undefined,
    sku,
    location: toOptionalString(item.location),
    quantity: toNumber(item.quantity),
    unitCost: toNumber(item.unitCost),
    reorderPoint: toNumber(item.reorderPoint),
    reorderThreshold:
      typeof item.reorderThreshold === 'number'
        ? item.reorderThreshold
        : toOptionalString(item.reorderThreshold) !== undefined
        ? Number(item.reorderThreshold)
        : undefined,
    lastRestockDate: toDateInput(item.lastRestockDate),
    vendor: resolveVendor(item.vendor),
    lastOrderDate: toDateInput(item.lastOrderDate),
    image: typeof item.image === 'string' ? item.image : undefined,
  };
};

export const normalizeInventoryCollection = (value: unknown): Part[] => {
  if (!Array.isArray(value)) return [];
  return value.map((item) => normalizeInventoryItem(item as InventoryApiItem));
};
