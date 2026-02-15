import React, { useMemo, useState } from 'react';
import BaseDataTable from '@/components/common/DataTable';
import Card from './Card';

export interface UiColumn<T> {
  id: string;
  header: string;
  accessor: keyof T | ((row: T) => React.ReactNode);
  className?: string;
}

interface UiDataTableProps<T> {
  title?: string;
  columns: UiColumn<T>[];
  data: T[];
  keyField: keyof T;
  stickyHeader?: boolean;
  searchable?: boolean;
  pageSize?: number;
  onRowClick?: (row: T) => void;
}

export default function UiDataTable<T>({
  title,
  columns,
  data,
  keyField,
  stickyHeader = false,
  searchable = true,
  pageSize = 15,
  onRowClick,
}: UiDataTableProps<T>) {
  const [query, setQuery] = useState('');
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable');
  const [visibleColumns, setVisibleColumns] = useState<string[]>(columns.map((column) => column.id));
  const [page, setPage] = useState(1);

  const filteredRows = useMemo(() => {
    if (!query.trim()) return data;
    return data.filter((row) =>
      Object.values(row as Record<string, unknown>).some((value) =>
        String(value ?? '').toLowerCase().includes(query.toLowerCase()),
      ),
    );
  }, [data, query]);

  const maxPage = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(page, maxPage);

  const pagedRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, pageSize, safePage]);

  const activeColumns = useMemo(
    () => columns.filter((column) => visibleColumns.includes(column.id)),
    [columns, visibleColumns],
  );

  const toggleColumn = (id: string) => {
    setVisibleColumns((current) =>
      current.includes(id) ? current.filter((columnId) => columnId !== id) : [...current, id],
    );
  };

  return (
    <Card>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          {title ? <h3 className="text-lg font-semibold text-[var(--wp-color-text)]">{title}</h3> : null}
          <p className="text-xs text-[var(--wp-color-text-muted)]">{filteredRows.length} rows</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {searchable ? (
            <input
              value={query}
              onChange={(event) => {
                setPage(1);
                setQuery(event.target.value);
              }}
              placeholder="Search table"
              className="rounded-lg border border-[var(--wp-color-border)] bg-transparent px-3 py-2 text-sm"
              aria-label="Search table"
            />
          ) : null}
          <button
            type="button"
            className="rounded-lg border border-[var(--wp-color-border)] px-3 py-2 text-xs"
            onClick={() => setDensity((prev) => (prev === 'comfortable' ? 'compact' : 'comfortable'))}
          >
            Density: {density}
          </button>
          <details className="relative">
            <summary className="cursor-pointer rounded-lg border border-[var(--wp-color-border)] px-3 py-2 text-xs list-none">
              Columns
            </summary>
            <div className="absolute right-0 z-10 mt-2 min-w-44 rounded-lg border border-[var(--wp-color-border)] bg-[var(--wp-color-surface)] p-2 shadow-lg">
              {columns.map((column) => (
                <label key={column.id} className="flex items-center gap-2 px-2 py-1 text-xs">
                  <input type="checkbox" checked={visibleColumns.includes(column.id)} onChange={() => toggleColumn(column.id)} />
                  {column.header}
                </label>
              ))}
            </div>
          </details>
        </div>
      </div>

      <div className={stickyHeader ? 'max-h-[560px] overflow-auto mt-3' : 'mt-3'}>
        <BaseDataTable
          columns={activeColumns}
          data={pagedRows}
          keyField={keyField}
          onRowClick={onRowClick}
          className={density === 'compact' ? '[&_.px-6]:px-3 [&_.py-4]:py-2' : ''}
        />
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-[var(--wp-color-text-muted)]">
        <span>
          Page {safePage} of {maxPage}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={safePage <= 1}
            className="rounded-md border border-[var(--wp-color-border)] px-2 py-1 disabled:opacity-40"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => setPage((prev) => Math.min(maxPage, prev + 1))}
            disabled={safePage >= maxPage}
            className="rounded-md border border-[var(--wp-color-border)] px-2 py-1 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </Card>
  );
}
