/* eslint-disable react-hooks/exhaustive-deps */
/*
 * SPDX-License-Identifier: MIT
 */

import { useMemo, useState } from 'react';
import { FileSpreadsheet, FileText, MessageSquare, Paperclip, Plus, RefreshCcw } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import Button from '@/components/common/Button';
import TextArea from '@/components/common/TextArea';
import { downloadInventoryExport, type InventoryExportFormat, upsertPart } from '@/api/inventory';
import type { Part } from '@/types';
import { INVENTORY_PARTS_QUERY_KEY, usePartsQuery, useVendorsQuery } from './hooks';
import { QrLabel } from '@/components/qr';
import { useToast } from '@/context/ToastContext';
import { INVENTORY_REPORTING_COLUMNS } from '@/utils/reportingFormat';
import { triggerFileDownload } from '@/utils/download';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

type SortDirection = 'asc' | 'desc';

const LoadingSkeleton = () => (
  <div className="space-y-3 p-4">
    {Array.from({ length: 6 }).map((_, index) => (
      <div key={index} className="animate-pulse rounded-lg border border-neutral-100 bg-neutral-50 p-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="h-4 w-40 rounded bg-neutral-200" />
          <div className="h-3 w-24 rounded bg-neutral-200" />
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <div className="h-3 w-24 rounded bg-neutral-200" />
          <div className="h-3 w-20 rounded bg-neutral-200" />
          <div className="h-3 w-28 rounded bg-neutral-200" />
        </div>
      </div>
    ))}
  </div>
);

const severityClass: Record<string, string> = {
  ok: 'bg-green-100 text-green-800',
  warning: 'bg-amber-100 text-amber-800',
  critical: 'bg-red-100 text-red-800',
};

const PartsTableView = () => {
  const { addToast } = useToast();
  const vendorsQuery = useVendorsQuery();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [vendorFilter, setVendorFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE_OPTIONS[0]);
  const [sortBy, setSortBy] = useState('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [noteTargetId, setNoteTargetId] = useState<string | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [exportingFormat, setExportingFormat] = useState<InventoryExportFormat | null>(null);

  const reportingColumns = useMemo(() => INVENTORY_REPORTING_COLUMNS.map((col) => col.header), []);

  const noteMutation = useMutation({
    mutationFn: ({ partId, notes }: { partId: string; notes: string }) => upsertPart({ id: partId, notes }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: INVENTORY_PARTS_QUERY_KEY });
      setNoteTargetId(null);
    },
  });

  const partsQuery = usePartsQuery({
    page,
    pageSize,
    search: search.trim() || undefined,
    vendorId: vendorFilter !== 'all' ? vendorFilter : undefined,
    sortBy,
    sortDirection,
  });

  const parts = partsQuery.data?.items ?? [];
  const total = partsQuery.data?.total ?? 0;
  const totalPages = partsQuery.data?.totalPages ?? Math.max(1, Math.ceil(total / pageSize));
  const vendorOptions = vendorsQuery.data ?? [];
  const hasPartsError = Boolean(partsQuery.error);

  const filteredParts = useMemo(() => parts, [parts]);

  const handleExport = async (format: InventoryExportFormat) => {
    setExportingFormat(format);
    try {
      const file = await downloadInventoryExport(format, {
        search: search.trim() || undefined,
        vendorId: vendorFilter !== 'all' ? vendorFilter : undefined,
        sortBy,
        sortDirection,
        page,
        pageSize,
        reportingColumns,
      });
      const blob = new Blob([file.data], { type: file.mimeType });
      triggerFileDownload(blob, file.fileName);
      addToast(`Downloaded ${file.fileName}`, 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to export inventory. Please try again.';
      addToast(message, 'error');
    } finally {
      setExportingFormat(null);
    }
  };

  const handleSort = (key: string) => {
    const nextDirection = sortBy === key && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortBy(key);
    setSortDirection(nextDirection);
    setPage(1);
  };

  const handlePageChange = (nextPage: number) => {
    setPage(Math.min(Math.max(1, nextPage), totalPages));
  };

  const openNoteForm = (partId: string) => {
    setNoteTargetId(partId);
    setNoteDrafts((prev) => ({ ...prev, [partId]: prev[partId] ?? '' }));
  };

  const saveNote = (part: Part) => {
    const draft = (noteDrafts[part.id] ?? '').trim();
    if (!draft) return;
    const mergedNotes = part.notes ? `${part.notes}\n\n${draft}` : draft;
    noteMutation.mutate({ partId: part.id, notes: mergedNotes });
  };

  return (
    <section className="rounded-lg border border-neutral-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-neutral-100 p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">Parts</h2>
          <p className="text-sm text-neutral-500">Linked assets and PM templates stay visible here.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <label className="flex items-center gap-2 text-sm text-neutral-600">
            <span>Vendor</span>
            <select
              className="rounded-md border border-neutral-300 px-2 py-1 text-sm"
              value={vendorFilter}
              onChange={(event) => {
                setVendorFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="all">All vendors</option>
              {vendorOptions.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </select>
          </label>
          <div className="relative">
            <svg
              className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M16 10a6 6 0 11-12 0 6 6 0 0112 0z" />
            </svg>
            <input
              type="search"
              placeholder="Search parts, assets, templates"
              className="min-w-[220px] rounded-md border border-neutral-300 px-3 py-1 pl-8 text-sm"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            icon={<FileSpreadsheet className="h-4 w-4" />}
            loading={exportingFormat === 'csv'}
            disabled={exportingFormat !== null}
            onClick={() => handleExport('csv')}
          >
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={<FileText className="h-4 w-4" />}
            loading={exportingFormat === 'pdf'}
            disabled={exportingFormat !== null}
            onClick={() => handleExport('pdf')}
          >
            Export PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={<RefreshCcw className="h-4 w-4" />}
            onClick={() => partsQuery.refetch()}
            loading={partsQuery.isFetching}
          >
            Refresh
          </Button>
          <label className="flex items-center gap-2 text-sm text-neutral-600">
            <span>Page size</span>
            <select
              className="rounded-md border border-neutral-300 px-2 py-1 text-sm"
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
            >
              {PAGE_SIZE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option} per page
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {partsQuery.isLoading && <LoadingSkeleton />}
      {hasPartsError && (
        <p className="p-4 text-sm text-error-600">Unable to load inventory. Please try again.</p>
      )}

      {!partsQuery.isLoading && !hasPartsError && (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-neutral-50 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-3">Part</th>
                <th className="px-4 py-3 cursor-pointer" onClick={() => handleSort('vendor')}>
                  Vendor {sortBy === 'vendor' && (sortDirection === 'asc' ? '▲' : '▼')}
                </th>
                <th className="px-4 py-3 cursor-pointer" onClick={() => handleSort('quantity')}>
                  Stock {sortBy === 'quantity' && (sortDirection === 'asc' ? '▲' : '▼')}
                </th>
                <th className="px-4 py-3">Linked assets</th>
                <th className="px-4 py-3">PM templates</th>
                <th className="px-4 py-3">Auto reorder</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredParts.map((part) => {
                const commentCount = part.commentsCount ?? (part.notes ? 1 : 0);
                const attachmentCount = part.attachmentsCount ?? part.attachments?.length ?? (part.image ? 1 : 0);
                const isNoteOpen = noteTargetId === part.id;
                const noteDraft = noteDrafts[part.id] ?? '';
                const noteSaving = noteMutation.isPending && noteMutation.variables?.partId === part.id;

                return (
                  <tr key={part.id} className={part.alertState?.needsReorder ? 'bg-warning-50/40' : undefined}>
                    <td className="px-4 py-3 align-top">
                      <p className="font-medium text-neutral-900">{part.name}</p>
                      <p className="text-xs text-neutral-500">SKU {part.sku ?? 'n/a'}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-neutral-500">
                        {commentCount > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-1 font-semibold">
                            <MessageSquare size={12} />
                            {commentCount} note{commentCount === 1 ? '' : 's'}
                          </span>
                        )}
                        {attachmentCount > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-1 font-semibold">
                            <Paperclip size={12} />
                            {attachmentCount} attachment{attachmentCount === 1 ? '' : 's'}
                          </span>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="px-2 py-1 text-xs"
                          icon={<Plus size={12} />}
                          onClick={() => openNoteForm(part.id)}
                        >
                          {isNoteOpen ? 'Editing note' : 'Quick add note'}
                        </Button>
                      </div>
                      {isNoteOpen && (
                        <div className="mt-3 space-y-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                          <TextArea
                            value={noteDraft}
                            onChange={(event) =>
                              setNoteDrafts((prev) => ({ ...prev, [part.id]: event.target.value }))
                            }
                            rows={3}
                            placeholder="Add a quick note about this part"
                          />
                          <div className="flex flex-wrap items-center gap-2">
                            <Button size="sm" onClick={() => saveNote(part)} loading={noteSaving} disabled={!noteDraft.trim()}>
                              Save note
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setNoteTargetId(null)}>
                              Cancel
                            </Button>
                            {part.notes && (
                              <p className="text-[11px] text-neutral-500">
                                We will append this to existing notes so you keep prior context.
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                      <div className="pt-2">
                        <QrLabel
                          name={part.name}
                          subtitle={part.vendor?.name ?? 'Part label'}
                          qrValue={part.qrCode ?? JSON.stringify({ type: 'part', id: part.id })}
                          showPreview={false}
                          buttonLabel="Print QR / Label"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-600 align-top">
                      {part.vendor ? (
                        <div>
                          <p className="font-medium text-neutral-900">{part.vendor.name}</p>
                          {part.vendor.leadTimeDays && (
                            <p className="text-xs text-neutral-500">Lead time {part.vendor.leadTimeDays} day(s)</p>
                          )}
                        </div>
                      ) : (
                        <p className="text-neutral-400">Unassigned</p>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top text-sm text-neutral-700">
                      <p className="font-semibold">{part.quantity ?? 0}</p>
                      <p className="text-xs text-neutral-500">Reorder @ {part.reorderPoint ?? 'n/a'}</p>
                      {part.stockByLocation?.length ? (
                        <div className="mt-2 rounded-md bg-neutral-50 p-2">
                          <p className="text-[11px] font-semibold uppercase text-neutral-500">By location</p>
                          <ul className="space-y-1 text-xs text-neutral-700">
                            {part.stockByLocation.map((stock) => (
                              <li key={stock.stockItemId} className="flex items-center justify-between gap-2">
                                <span>
                                  {[stock.location?.store, stock.location?.room, stock.location?.bin]
                                    .filter(Boolean)
                                    .join(' / ') || 'Unassigned'}
                                </span>
                                <span className="text-neutral-500">{stock.quantity}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <p className="text-xs text-neutral-400">No location assignments</p>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top text-sm text-neutral-700">
                      {part.assets && part.assets.length > 0 ? (
                        <ul className="list-inside list-disc text-xs text-neutral-600">
                          {part.assets.slice(0, 3).map((asset) => (
                            <li key={asset.id}>{asset.name}</li>
                          ))}
                          {part.assets.length > 3 && (
                            <li className="text-neutral-400">+{part.assets.length - 3} more</li>
                          )}
                        </ul>
                      ) : (
                        <p className="text-neutral-400">No linked assets</p>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top text-sm text-neutral-700">
                      {part.pmTemplates && part.pmTemplates.length > 0 ? (
                        <ul className="list-inside list-disc text-xs text-neutral-600">
                          {part.pmTemplates.map((template) => (
                            <li key={template.id}>{template.title}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-neutral-400">No PM templates</p>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top text-sm text-neutral-700">
                      {part.alertState ? (
                        <div className="space-y-1">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                              severityClass[part.alertState.severity ?? 'ok'] ?? severityClass.ok
                            }`}
                          >
                            {part.alertState.severity ?? 'ok'}
                          </span>
                        </div>
                      ) : (
                        <p className="text-neutral-400">No alerts</p>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 p-4 text-sm text-neutral-600">
        <div>
          Page {page} of {totalPages}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => handlePageChange(page - 1)}>
            Previous
          </Button>
          <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => handlePageChange(page + 1)}>
            Next
          </Button>
        </div>
      </div>

      {partsQuery.isFetching && !partsQuery.isLoading && (
        <div className="pointer-events-none absolute inset-0 bg-white/40 backdrop-blur-sm" aria-hidden>
          <LoadingSkeleton />
        </div>
      )}
    </section>
  );
};

export default PartsTableView;



