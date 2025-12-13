/*
 * SPDX-License-Identifier: MIT
 */

import { describe, expect, it } from 'vitest';

import type { Part } from '@/types';
import {
  INVENTORY_REPORTING_COLUMNS,
  formatInventoryReportingRow,
  formatReportingDate,
  formatReportingNumber,
} from './reportingFormat';

const basePart: Part = {
  id: 'part-1',
  tenantId: 'tenant-1',
  name: 'Hydraulic Pump',
  sku: 'HP-100',
  quantity: 1234.56,
  reorderPoint: 10,
  unitCost: 42.5,
  vendor: { id: 'vendor-1', name: 'Acme Industrial' },
  autoReorder: true,
  lastRestockDate: '2024-03-01T00:00:00Z',
  lastOrderDate: '2024-02-15',
  assets: [
    { id: 'asset-1', name: 'Press A' },
    { id: 'asset-2', name: 'Line B' },
  ],
  pmTemplates: [{ id: 'tmpl-1', title: 'Monthly PM' }],
  reorderQty: 5,
  reorderThreshold: 2,
};

describe('reportingFormat helpers', () => {
  it('formats numbers consistently for reporting', () => {
    expect(formatReportingNumber(1234.56)).toBe('1,234.6');
    expect(formatReportingNumber(0)).toBe('0');
    expect(formatReportingNumber(null)).toBe('0');
  });

  it('formats dates and handles invalid values', () => {
    expect(formatReportingDate('2024-02-20')).toBe('Feb 20, 2024');
    expect(formatReportingDate(undefined)).toBe('—');
    expect(formatReportingDate('not-a-date')).toBe('—');
  });

  it('builds inventory rows in reporting column order', () => {
    const row = formatInventoryReportingRow(basePart);
    const headers = Object.keys(row);

    expect(headers).toEqual(INVENTORY_REPORTING_COLUMNS.map((col) => col.header));
    expect(row['Part Name']).toBe('Hydraulic Pump');
    expect(row['Quantity on Hand']).toBe('1,234.6');
    expect(row['Unit Cost']).toBe('$42.50');
    expect(row['Linked Assets']).toBe('Press A; Line B');
    expect(row['PM Templates']).toBe('Monthly PM');
    expect(row['Auto Reorder']).toBe('Yes');
  });
});
