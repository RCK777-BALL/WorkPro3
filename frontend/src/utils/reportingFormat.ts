/*
 * SPDX-License-Identifier: MIT
 */

import type { Part } from '@/types';

const numberFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: '2-digit',
});

export const formatReportingNumber = (value?: number | null): string => {
  if (typeof value !== 'number' || Number.isNaN(value)) return '0';
  return numberFormatter.format(value);
};

export const formatReportingDate = (value?: string | Date | null): string => {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.valueOf())) return '—';
  return dateFormatter.format(date);
};

export interface ReportingColumn<T> {
  key: keyof T | string;
  header: string;
  accessor: (item: T) => string;
}

export const INVENTORY_REPORTING_COLUMNS: ReportingColumn<Part>[] = [
  { key: 'name', header: 'Part Name', accessor: (part) => part.name },
  {
    key: 'sku',
    header: 'SKU / Part #',
    accessor: (part) => part.sku ?? part.partNumber ?? part.partNo ?? '—',
  },
  { key: 'vendor', header: 'Vendor', accessor: (part) => part.vendor?.name ?? 'Unassigned' },
  {
    key: 'quantity',
    header: 'Quantity on Hand',
    accessor: (part) => formatReportingNumber(part.quantity),
  },
  {
    key: 'reorderPoint',
    header: 'Reorder Point',
    accessor: (part) => formatReportingNumber(part.reorderPoint),
  },
  {
    key: 'unitCost',
    header: 'Unit Cost',
    accessor: (part) => (typeof part.unitCost === 'number' ? currencyFormatter.format(part.unitCost) : '—'),
  },
  {
    key: 'lastRestockDate',
    header: 'Last Restock',
    accessor: (part) => formatReportingDate(part.lastRestockDate),
  },
  {
    key: 'lastOrderDate',
    header: 'Last Ordered',
    accessor: (part) => formatReportingDate(part.lastOrderDate),
  },
  {
    key: 'assets',
    header: 'Linked Assets',
    accessor: (part) => (part.assets?.map((asset) => asset.name).filter(Boolean).join('; ') || '—'),
  },
  {
    key: 'pmTemplates',
    header: 'PM Templates',
    accessor: (part) =>
      part.pmTemplates?.map((template) => template.name ?? template.title ?? '').filter(Boolean).join('; ') || '—',
  },
  {
    key: 'autoReorder',
    header: 'Auto Reorder',
    accessor: (part) => (part.autoReorder ? 'Yes' : 'No'),
  },
];

export const formatInventoryReportingRow = (part: Part): Record<string, string> =>
  INVENTORY_REPORTING_COLUMNS.reduce<Record<string, string>>((row, column) => {
    row[column.header] = column.accessor(part);
    return row;
  }, {});
