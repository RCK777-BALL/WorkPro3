/*
 * SPDX-License-Identifier: MIT
 */

import http from '@/lib/http';

export type ImportEntity = 'assets' | 'pms' | 'workOrders' | 'parts';

export type ImportPreviewRow = Record<string, string | number | undefined>;

export type ImportValidationError = {
  row: number;
  field?: string;
  message: string;
};

export type ImportSummary = {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  errors: ImportValidationError[];
  preview: ImportPreviewRow[];
  columns: string[];
  detectedFormat: 'csv' | 'xlsx';
};

export type ExportFormat = 'csv' | 'xlsx';

export const uploadImport = async (entity: ImportEntity, file: File): Promise<ImportSummary> => {
  const formData = new FormData();
  formData.append('file', file);

  const res = await http.post<ImportSummary>(`/import-export/${entity}/import`, formData);
  return res.data;
};

export const downloadAssetExport = async (format: ExportFormat): Promise<Blob> => {
  const res = await http.get<Blob>('/import-export/assets/export', {
    params: { format },
    responseType: 'blob',
  });
  return res.data;
};
