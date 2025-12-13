/*
 * SPDX-License-Identifier: MIT
 */

import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';

import http from '@/lib/http';
import { downloadInventoryExport } from './inventory';

describe('downloadInventoryExport', () => {
  const mockGet = vi.spyOn(http, 'get');

  afterEach(() => {
    mockGet.mockReset();
  });

  afterAll(() => {
    mockGet.mockRestore();
  });

  it('passes active filters and sorting to the export endpoint', async () => {
    mockGet.mockResolvedValue({ data: new ArrayBuffer(0), headers: {} });

    await downloadInventoryExport('csv', {
      search: 'pump',
      vendorId: 'vendor-123',
      sortBy: 'name',
      sortDirection: 'desc',
      page: 2,
      pageSize: 50,
      reportingColumns: ['Part Name', 'Quantity on Hand'],
    });

    expect(mockGet).toHaveBeenCalledWith('/inventory/export', {
      params: {
        format: 'csv',
        search: 'pump',
        vendorId: 'vendor-123',
        sortBy: 'name',
        sortDirection: 'desc',
        page: 2,
        pageSize: 50,
        reportingColumns: ['Part Name', 'Quantity on Hand'],
      },
      responseType: 'arraybuffer',
    });
  });

  it('extracts filenames and mime types from response headers', async () => {
    const buffer = new ArrayBuffer(8);
    mockGet.mockResolvedValue({
      data: buffer,
      headers: {
        'content-disposition': 'attachment; filename="inventory-export.csv"',
        'content-type': 'text/csv',
      },
    });

    const result = await downloadInventoryExport('csv');

    expect(result.fileName).toBe('inventory-export.csv');
    expect(result.mimeType).toBe('text/csv');
    expect(result.data).toBe(buffer);
  });
});
