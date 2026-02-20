/*
 * SPDX-License-Identifier: MIT
 */

import { useMemo, useState, type ChangeEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  UploadCloud,
} from 'lucide-react';

import {
  downloadAssetExport,
  uploadImport,
  type ExportFormat,
  type ImportEntity,
  type ImportPreviewRow,
  type ImportSummary,
} from '@/api/importExport';

type UploadStage = 'idle' | 'uploading' | 'processing' | 'complete' | 'error';

const PREVIEW_COLUMNS: Array<{ key: keyof ImportPreviewRow; label: string }> = [
  { key: 'name', label: 'Name' },
  { key: 'type', label: 'Type' },
  { key: 'status', label: 'Status' },
  { key: 'location', label: 'Location' },
  { key: 'department', label: 'Department' },
  { key: 'line', label: 'Line' },
  { key: 'station', label: 'Station' },
  { key: 'serialNumber', label: 'Serial #' },
  { key: 'criticality', label: 'Criticality' },
];

const uploadProgress: Record<UploadStage, { value: number; label: string }> = {
  idle: { value: 0, label: 'No upload in progress' },
  uploading: { value: 30, label: 'Uploading file…' },
  processing: { value: 70, label: 'Parsing with SheetJS & PapaParse…' },
  complete: { value: 100, label: 'Validation complete' },
  error: { value: 100, label: 'Upload failed' },
};

const IMPORT_TARGETS: Array<{ value: ImportEntity; label: string; description: string }> = [
  { value: 'assets', label: 'Assets', description: 'Equipment registry columns' },
  { value: 'pms', label: 'PMs', description: 'Recurring maintenance tasks' },
  { value: 'workOrders', label: 'Work orders', description: 'Open and historical work' },
  { value: 'parts', label: 'Parts & inventory', description: 'Stock, bins, and reorder points' },
];

const formatDate = (value?: Date | null) =>
  value ? value.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';

const formatError = (err: unknown) =>
  err instanceof Error ? err.message : 'Something went wrong. Please try again.';

export const ImportExportPanel = () => {
  const [importEntity, setImportEntity] = useState<ImportEntity>('assets');
  const [uploadStage, setUploadStage] = useState<UploadStage>('idle');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [lastUploadedFile, setLastUploadedFile] = useState<string>('');
  const [lastDownloadedAt, setLastDownloadedAt] = useState<Date | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const uploadMutation = useMutation<ImportSummary, Error, { entity: ImportEntity; file: File }>({
    mutationFn: (payload) => uploadImport(payload.entity, payload.file),
  });
  const downloadMutation = useMutation<Blob, Error, ExportFormat>({
    mutationFn: downloadAssetExport,
  });

  const handleFile = async (file?: File) => {
    if (!file) return;
    setUploadError(null);
    setLastUploadedFile(file.name);
    setUploadStage('uploading');
    try {
      const pending = uploadMutation.mutateAsync({ entity: importEntity, file });
      setUploadStage('processing');
      const result = await pending;
      setSummary(result);
      setUploadStage('complete');
    } catch (err) {
      setUploadStage('error');
      setUploadError(formatError(err));
    }
  };

  const onFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    await handleFile(file);
    event.target.value = '';
  };

  const handleDownload = async (format: ExportFormat) => {
    setDownloadError(null);
    try {
      const blob = await downloadMutation.mutateAsync(format);
      const fileName = format === 'csv' ? 'assets.csv' : 'assets.xlsx';
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      anchor.click();
      URL.revokeObjectURL(url);
      setLastDownloadedAt(new Date());
    } catch (err) {
      setDownloadError(formatError(err));
    }
  };

  const stats = useMemo(
    () => (
      summary
        ? [
            { label: 'Rows scanned', value: summary.totalRows.toLocaleString() },
            { label: 'Valid rows', value: summary.validRows.toLocaleString() },
            { label: 'Issues found', value: summary.errors.length.toLocaleString() },
          ]
        : []
    ),
    [summary],
  );

  const previewColumns = useMemo(() => {
    if (summary?.columns.length) {
      return summary.columns.slice(0, 8).map((key) => ({ key, label: key.replace(/([A-Z])/g, ' $1') }));
    }
    return PREVIEW_COLUMNS;
  }, [summary]);

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary-600">Import</p>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
              Upload CSV/XLSX for assets, PMs, work orders, and parts
            </h2>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              CSV and XLSX files are parsed in-memory using PapaParse + SheetJS so you can validate data before committing it.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {IMPORT_TARGETS.map((target) => {
                const active = importEntity === target.value;
                return (
                  <button
                    key={target.value}
                    type="button"
                    onClick={() => setImportEntity(target.value)}
                    className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                      active
                        ? 'border-primary-400 bg-primary-50 text-primary-900 dark:border-primary-500/70 dark:bg-primary-900/20 dark:text-primary-50'
                        : 'border-neutral-200 bg-neutral-50 text-neutral-800 hover:border-primary-300 hover:bg-white dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50'
                    }`}
                  >
                    <span className="block font-semibold">{target.label}</span>
                    <span className="block text-xs text-neutral-500 dark:text-neutral-400">{target.description}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <label className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-70">
            <UploadCloud className="h-4 w-4" />
            <span>{uploadMutation.isPending ? 'Uploading…' : 'Select file'}</span>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={onFileChange}
              disabled={uploadMutation.isPending}
              className="sr-only"
            />
          </label>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <div className="flex items-center justify-between text-xs font-medium text-neutral-500">
              <span>{uploadProgress[uploadStage].label}</span>
              <span>{uploadProgress[uploadStage].value}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
              <div
                className={`h-full rounded-full bg-primary-500 transition-all ${uploadStage === 'error' ? 'bg-rose-500' : ''}`}
                style={{ width: `${uploadProgress[uploadStage].value}%` }}
              />
            </div>
            {lastUploadedFile ? (
              <p className="mt-1 text-xs text-neutral-500">Last file: {lastUploadedFile}</p>
            ) : null}
            {uploadError ? (
              <p className="mt-2 text-sm text-rose-600">{uploadError}</p>
            ) : null}
          </div>

          {stats.length ? (
            <dl className="grid gap-4 rounded-xl bg-neutral-50 p-4 text-sm dark:bg-neutral-800/60 sm:grid-cols-3">
              {stats.map((stat) => (
                <div key={stat.label}>
                  <dt className="text-neutral-500">{stat.label}</dt>
                  <dd className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">{stat.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          {summary?.columns.length ? (
            <p className="text-xs text-neutral-500">
              Detected columns: {summary.columns.slice(0, 5).join(', ')}
              {summary.columns.length > 5 ? ` +${summary.columns.length - 5} more` : ''}
            </p>
          ) : null}

          {summary?.errors.length ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-sm text-amber-900">
              <div className="flex items-center gap-2 font-medium">
                <AlertTriangle className="h-4 w-4" />
                {summary.errors.length} validation issue{summary.errors.length === 1 ? '' : 's'} detected
              </div>
              <ul className="mt-2 space-y-1">
                {summary.errors.slice(0, 5).map((issue) => (
                  <li key={`${issue.row}-${issue.field ?? 'row'}`}>
                    Row {issue.row}: {issue.message}
                  </li>
                ))}
              </ul>
              {summary.errors.length > 5 ? (
                <p className="mt-2 text-xs">+{summary.errors.length - 5} additional issue{summary.errors.length - 5 === 1 ? '' : 's'} hidden</p>
              ) : null}
            </div>
          ) : summary && !summary.errors.length ? (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50/80 p-3 text-sm text-emerald-900">
              <CheckCircle2 className="h-4 w-4" />
              No validation issues detected
            </div>
          ) : null}

          {summary?.preview.length ? (
            <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center gap-2 border-b border-neutral-200 bg-neutral-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:border-neutral-800 dark:bg-neutral-800">
                <FileSpreadsheet className="h-4 w-4" /> Preview ({summary.preview.length} rows)
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-neutral-200 text-sm dark:divide-neutral-800">
                  <thead className="bg-neutral-50 dark:bg-neutral-900/50">
                    <tr>
                      {previewColumns.map((column) => (
                        <th
                          key={column.key}
                          scope="col"
                          className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500"
                        >
                          {column.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 bg-white dark:divide-neutral-800 dark:bg-neutral-900">
                    {summary.preview.map((row, rowIndex) => (
                      <tr key={`${rowIndex}-${summary.detectedFormat}`}>
                        {previewColumns.map((column) => (
                          <td key={column.key} className="px-3 py-2 text-neutral-800 dark:text-neutral-100">
                            {(row as ImportPreviewRow)[column.key] ?? '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary-600">Export</p>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">Download tenant snapshot</h2>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              Generates a filtered view of all tenant assets so you can reconcile imports offline.
            </p>
          </div>
          <div className="text-xs text-neutral-500">
            Last download: {formatDate(lastDownloadedAt)}
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {[
            { format: 'csv' as ExportFormat, label: 'CSV export', description: 'Fast preview for spreadsheets' },
            { format: 'xlsx' as ExportFormat, label: 'Excel export', description: 'Rich formatting + formulas' },
          ].map((item) => (
            <button
              key={item.format}
              type="button"
              onClick={() => handleDownload(item.format)}
              disabled={downloadMutation.isPending}
              className="flex items-start justify-between rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-left text-sm font-medium text-neutral-900 shadow-sm transition hover:border-primary-400 hover:bg-white disabled:cursor-not-allowed disabled:opacity-70 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50"
            >
              <span>
                {item.label}
                <span className="block text-xs font-normal text-neutral-500">{item.description}</span>
              </span>
              <Download className="h-4 w-4 text-primary-500" />
            </button>
          ))}
        </div>

        {downloadError ? <p className="mt-3 text-sm text-rose-600">{downloadError}</p> : null}
      </section>
    </div>
  );
};

export default ImportExportPanel;
