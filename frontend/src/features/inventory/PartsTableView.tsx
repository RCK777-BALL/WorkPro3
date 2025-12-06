/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCcw, Search } from 'lucide-react';
import AutoSizer from 'react-virtualized-auto-sizer';
import {
  VariableSizeGrid as Grid,
  type GridChildComponentProps,
  type GridOnScrollProps,
  type VariableSizeGrid,
} from 'react-window';

import Button from '@/components/common/Button';
import type { Part, SortDirection } from '@/types';
import { usePartsQuery, useVendorsQuery } from './hooks';
import { QrLabel } from '@/components/qr';
import { StockLevelBadge } from './AlertIndicators';
import { useSearchParams } from 'react-router-dom';
import clsx from 'clsx';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const HEADER_HEIGHT = 48;
const ROW_HEIGHT = 112;

interface ColumnDefinition {
  key: string;
  label: string;
  width: number;
  sortable?: boolean;
  render: (part: Part) => React.ReactNode;
}

interface GridData {
  columns: ColumnDefinition[];
  parts: Part[];
  onSort: (key: string) => void;
  sortBy: string;
  sortDirection: SortDirection;
}

const EmptyState = ({ message }: { message: string }) => (
  <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-neutral-500">
    <p>{message}</p>
  </div>
);

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

const HeaderCell = ({ columnIndex, style, data }: GridChildComponentProps<GridData>) => {
  const column = data.columns[columnIndex];
  const isSorted = data.sortBy === column.key;
  const direction = data.sortDirection === 'asc' ? '▲' : '▼';

  return (
    <div
      style={style}
      className={clsx(
        'flex items-center border-b border-neutral-100 bg-neutral-50 px-4 text-xs font-semibold uppercase tracking-wide text-neutral-600',
        column.sortable ? 'cursor-pointer select-none' : 'cursor-default',
      )}
      onClick={() => column.sortable && data.onSort(column.key)}
      role={column.sortable ? 'button' : undefined}
      tabIndex={column.sortable ? 0 : undefined}
    >
      <span>{column.label}</span>
      {isSorted && <span className="ml-1 text-[10px] text-neutral-400">{direction}</span>}
    </div>
  );
};

const BodyCell = ({ columnIndex, rowIndex, style, data }: GridChildComponentProps<GridData>) => {
  const column = data.columns[columnIndex];
  const part = data.parts[rowIndex];
  return (
    <div
      style={style}
      className={clsx(
        'border-b border-neutral-100 px-4 py-3 text-sm text-neutral-700',
        rowIndex % 2 === 0 ? 'bg-white' : 'bg-neutral-50/40',
      )}
    >
      {column.render(part)}
    </div>
  );
};

const PartsTableView = () => {
  const vendorsQuery = useVendorsQuery();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [vendorFilter, setVendorFilter] = useState(searchParams.get('vendor') ?? 'all');
  const [page, setPage] = useState(() => Number(searchParams.get('page')) || 1);
  const [pageSize, setPageSize] = useState(() => Number(searchParams.get('pageSize')) || 25);
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') ?? 'name');
  const [sortDirection, setSortDirection] = useState<SortDirection>(
    searchParams.get('sortDirection') === 'desc' ? 'desc' : 'asc',
  );

  useEffect(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    if (vendorFilter !== 'all') params.set('vendor', vendorFilter);
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    params.set('sortBy', sortBy);
    params.set('sortDirection', sortDirection);
    setSearchParams(params, { replace: true });
  }, [page, pageSize, search, sortBy, sortDirection, vendorFilter, setSearchParams]);

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

  const headerRef = useRef<VariableSizeGrid<GridData>>(null);
  const bodyRef = useRef<VariableSizeGrid<GridData>>(null);

  const handleScroll = ({ scrollLeft }: GridOnScrollProps) => {
    headerRef.current?.scrollTo({ scrollLeft, scrollTop: 0 });
  };

  const handleSort = (key: string) => {
    const nextDirection = sortBy === key && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortBy(key);
    setSortDirection(nextDirection);
    setPage(1);
  };

  const columns = useMemo<ColumnDefinition[]>(
    () => [
      {
        key: 'name',
        label: 'Part',
        width: 280,
        sortable: true,
        render: (part) => (
          <div className="flex flex-col gap-2 text-sm text-neutral-700">
            <div>
              <p className="font-semibold text-neutral-900">{part.name}</p>
              <p className="text-xs text-neutral-500">SKU {part.sku ?? 'n/a'}</p>
            </div>
            <QrLabel
              name={part.name}
              subtitle={part.vendor?.name ?? 'Part label'}
              qrValue={part.qrCode ?? JSON.stringify({ type: 'part', id: part.id })}
              showPreview={false}
              buttonLabel="Print QR Label"
            />
          </div>
        ),
      },
      {
        key: 'vendor',
        label: 'Vendor',
        width: 200,
        sortable: true,
        render: (part) => (
          <div className="text-sm text-neutral-700">
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
          </div>
        ),
      },
      {
        key: 'quantity',
        label: 'Stock',
        width: 180,
        sortable: true,
        render: (part) => (
          <div className="space-y-2">
            <StockLevelBadge alertState={part.alertState} quantity={part.quantity} reorderPoint={part.reorderPoint} />
            <p className="text-xs text-neutral-500">Reorder @ {part.reorderPoint}</p>
            {part.stockByLocation?.length ? (
              <div className="rounded-md bg-neutral-50 p-2">
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
          </div>
        ),
      },
      {
        key: 'assets',
        label: 'Linked assets',
        width: 220,
        sortable: true,
        render: (part) => (
          <div className="text-sm text-neutral-700">
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
              <p className="text-xs text-neutral-400">No linked assets</p>
            )}
          </div>
        ),
      },
      {
        key: 'templates',
        label: 'PM templates',
        width: 220,
        sortable: true,
        render: (part) => (
          <div className="text-sm text-neutral-700">
            {part.pmTemplates && part.pmTemplates.length > 0 ? (
              <ul className="list-inside list-disc text-xs text-neutral-600">
                {part.pmTemplates.slice(0, 3).map((template) => (
                  <li key={template.id}>{template.title}</li>
                ))}
                {part.pmTemplates.length > 3 && (
                  <li className="text-neutral-400">+{part.pmTemplates.length - 3} more</li>
                )}
              </ul>
            ) : (
              <p className="text-xs text-neutral-400">Not in templates</p>
            )}
          </div>
        ),
      },
      {
        key: 'autoReorder',
        label: 'Auto reorder',
        width: 160,
        sortable: true,
        render: (part) => (
          <div className="text-xs text-neutral-500">
            {part.autoReorder ? <p className="text-success-600">Enabled</p> : <p className="text-neutral-400">Off</p>}
            {part.lastAutoReorderAt && (
              <p className="text-[11px] text-neutral-400">
                Last {new Date(part.lastAutoReorderAt).toLocaleDateString()}
              </p>
            )}
          </div>
        ),
      },
    ],
    [],
  );

  const columnWidth = (index: number) => columns[index]?.width ?? 180;

  const handlePageChange = (nextPage: number) => {
    setPage(Math.min(Math.max(1, nextPage), totalPages));
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
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
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
            icon={<RefreshCcw size={14} />}
            onClick={() => partsQuery.refetch()}
            loading={partsQuery.isFetching}
          >
            Refresh
          </Button>
        </div>
      </div>

      <div className="px-4 py-3">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-neutral-600">
            Showing {parts.length ? (page - 1) * pageSize + 1 : 0} –
            {Math.min(total, page * pageSize)} of {total} parts
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-neutral-600">
            <span>Rows per page</span>
            <select
              className="rounded-md border border-neutral-300 px-2 py-1"
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
            >
              {PAGE_SIZE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={() => handlePageChange(page - 1)} disabled={page === 1}>
                Prev
              </Button>
              <span className="text-xs text-neutral-500">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </div>

        <div className="relative">
          {partsQuery.isLoading ? (
            <LoadingSkeleton />
          ) : parts.length === 0 ? (
            <EmptyState message={search || vendorFilter !== 'all' ? 'No parts matched your filters.' : 'No parts found.'} />
          ) : (
            <div className="h-[520px]">
              <AutoSizer>
                {({ height, width }) => (
                  <div>
                    <Grid
                      ref={headerRef}
                      columnCount={columns.length}
                      columnWidth={columnWidth}
                      height={HEADER_HEIGHT}
                      rowCount={1}
                      rowHeight={() => HEADER_HEIGHT}
                      width={width}
                      itemData={{ columns, parts, onSort: handleSort, sortBy, sortDirection }}
                      style={{ overflow: 'hidden' }}
                    >
                      {HeaderCell}
                    </Grid>
                    <Grid
                      ref={bodyRef}
                      columnCount={columns.length}
                      columnWidth={columnWidth}
                      height={Math.max(HEADER_HEIGHT, height - HEADER_HEIGHT)}
                      rowCount={parts.length}
                      rowHeight={() => ROW_HEIGHT}
                      width={width}
                      onScroll={handleScroll}
                      itemData={{ columns, parts, onSort: handleSort, sortBy, sortDirection }}
                      overscanRowCount={4}
                      overscanColumnCount={2}
                    >
                      {BodyCell}
                    </Grid>
                  </div>
                )}
              </AutoSizer>
            </div>
          )}
          {partsQuery.isFetching && !partsQuery.isLoading && (
            <div className="pointer-events-none absolute inset-0 bg-white/40 backdrop-blur-sm" aria-hidden>
              <LoadingSkeleton />
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default PartsTableView;
