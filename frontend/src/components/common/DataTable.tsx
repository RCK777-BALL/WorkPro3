/*
 * SPDX-License-Identifier: MIT
 */

import React, { useState } from 'react';
import clsx from 'clsx';

interface Column<T> {
  header: string;
  accessor: keyof T | ((row: T) => React.ReactNode);
  className?: string;
  /**
   * Stable identifier used for ordering, persistence, and sort tracking.
   * Falls back to the header value when omitted to preserve backward compatibility.
   */
  id?: string;
}

type DataTableVariant = 'default' | 'dark';

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField: keyof T;
  onRowClick?: (row: T) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  className?: string;
  variant?: DataTableVariant;
  /**
   * Optional controlled sort state. When provided, the table will respect the
   * supplied column identifier and direction instead of managing its own state.
   */
  sortState?: { columnId: string | null; direction: 'asc' | 'desc' };
  /**
   * Initial sort to apply when the table first renders. Ignored when a
   * controlled sortState is provided.
   */
  initialSort?: { columnId: string; direction: 'asc' | 'desc' };
  onSortChange?: (state: { columnId: string; direction: 'asc' | 'desc' } | null) => void;
}

function DataTable<T>({
  columns,
  data,
  keyField,
  onRowClick,
  isLoading = false,
  emptyMessage = 'No data available',
  className = '',
  variant = 'default',
  sortState,
  onSortChange,
  initialSort,
}: DataTableProps<T>) {
  const columnIdMap = React.useMemo(
    () =>
      columns.reduce<Record<string, Column<T>>>(
        (acc, column) => {
          const id = column.id ?? column.header;
          acc[id] = column;
          return acc;
        },
        {},
      ),
    [columns],
  );

  const resolveSortableAccessor = (columnId: string | null): keyof T | null => {
    if (!columnId) return null;
    const column = columnIdMap[columnId];
    if (!column || typeof column.accessor === 'function') return null;
    return column.accessor;
  };

  const [internalSort, setInternalSort] = useState<{
    columnId: string | null;
    direction: 'asc' | 'desc';
  }>(() => {
    if (initialSort) {
      const accessor = resolveSortableAccessor(initialSort.columnId);
      if (accessor) {
        return { columnId: initialSort.columnId, direction: initialSort.direction };
      }
    }
    return { columnId: null, direction: 'asc' };
  });

  React.useEffect(() => {
    if (!initialSort) return;
    const accessor = resolveSortableAccessor(initialSort.columnId);
    if (!accessor) return;
    setInternalSort((prev) => {
      if (prev.columnId === initialSort.columnId && prev.direction === initialSort.direction) {
        return prev;
      }
      return { columnId: initialSort.columnId, direction: initialSort.direction };
    });
  }, [initialSort?.columnId, initialSort?.direction]);

  React.useEffect(() => {
    const headers = columns.map((col) => col.header);
    if (new Set(headers).size !== headers.length) {
      console.warn('DataTable: column headers must be unique to ensure stable keys.');
    }
  }, [columns]);

  const handleRowKeyDown = (e: React.KeyboardEvent<HTMLTableRowElement>, row: T) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onRowClick && onRowClick(row);
    }
  };

  const handleHeaderKeyDown = (
    e: React.KeyboardEvent<HTMLTableHeaderCellElement>,
    accessor: keyof T | ((row: T) => React.ReactNode)
  ) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      typeof accessor !== 'function' && handleSort(accessor);
    }
  };

  const handleSort = (column: keyof T | ((row: T) => React.ReactNode), columnId?: string) => {
    if (typeof column === 'function') return;

    const resolvedId = columnId ?? String(column);
    const currentSort = sortState ?? internalSort;
    const nextDirection =
      currentSort.columnId === resolvedId && currentSort.direction === 'asc' ? 'desc' : 'asc';
    const nextSort = { columnId: resolvedId, direction: nextDirection as 'asc' | 'desc' };

    if (onSortChange) {
      onSortChange(nextSort);
    }
    if (!sortState) {
      setInternalSort(nextSort);
    }
  };

  const getCellValue = (row: T, accessor: keyof T | ((row: T) => React.ReactNode)) => {
    if (typeof accessor === 'function') {
      return accessor(row);
    }
    return row[accessor];
  };

  const activeSort = sortState ?? internalSort;
  const sortAccessor = resolveSortableAccessor(activeSort.columnId);

  const sortedData = React.useMemo(() => {
    if (!sortAccessor) return data;

    return [...data].sort((a, b) => {
      const aValue = a[sortAccessor];
      const bValue = b[sortAccessor];

      if (aValue === bValue) return 0;

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      const comparison = String(aValue).localeCompare(String(bValue));
      return activeSort.direction === 'asc' ? comparison : -comparison;
    });
  }, [data, sortAccessor, activeSort.direction]);

  const variants: Record<DataTableVariant, {
    container: string;
    table: string;
    header: string;
    headerCell: string;
    sortIndicator: string;
    body: string;
    row: string;
    rowClickable: string;
    cell: string;
    emptyCell: string;
  }> = {
    default: {
      container: '',
      table: 'divide-y divide-neutral-200 dark:divide-neutral-700',
      header: 'bg-neutral-50 dark:bg-neutral-800',
      headerCell:
        'px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide',
      sortIndicator: 'text-neutral-400 dark:text-neutral-500',
      body: 'bg-white dark:bg-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-700',
      row: '',
      rowClickable:
        'hover:bg-neutral-50 dark:hover:bg-neutral-700 cursor-pointer transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-primary-500 dark:focus-visible:ring-primary-300 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900',
      cell: 'px-6 py-4 whitespace-nowrap text-sm text-neutral-900 dark:text-neutral-200',
      emptyCell: 'px-6 py-10 text-center text-sm text-neutral-500 dark:text-neutral-400',
    },
    dark: {
      container: 'rounded-xl border border-slate-800 bg-slate-900/60',
      table: 'text-slate-200',
      header: 'bg-slate-900/60',
      headerCell:
        'px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400',
      sortIndicator: 'text-slate-500',
      body: 'bg-slate-950/20',
      row: 'border-t border-slate-800',
      rowClickable:
        'hover:bg-slate-900/40 cursor-pointer transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
      cell: 'px-4 py-3 whitespace-nowrap text-sm text-slate-200',
      emptyCell: 'px-4 py-10 text-center text-sm text-slate-400',
    },
  };

  const styles = variants[variant];

  if (isLoading) {
    return (
      <div className="min-h-[200px] flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-neutral-200 dark:bg-neutral-700"></div>
          <div className="mt-2 w-24 h-4 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={clsx('overflow-x-auto', styles.container, className)}>
      <table className={clsx('min-w-full text-sm', styles.table)}>
        <thead className={styles.header}>
          <tr>
            {columns.map((column) => {
              const columnId = column.id ?? column.header;
              const isSortable = typeof column.accessor !== 'function';
              const isSorted = activeSort.columnId === columnId;

              return (
                <th
                  key={columnId}
                  scope="col"
                  className={clsx(
                    styles.headerCell,
                    isSortable
                      ? 'cursor-pointer focus-visible:ring-2 focus-visible:ring-primary-500 dark:focus-visible:ring-primary-300 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900'
                      : 'cursor-default',
                    column.className,
                  )}
                  onClick={() => isSortable && handleSort(column.accessor, columnId)}
                  tabIndex={isSortable ? 0 : undefined}
                  onKeyDown={(e) => handleHeaderKeyDown(e, column.accessor)}
                  aria-sort={
                    isSortable
                      ? isSorted
                        ? activeSort.direction === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                      : undefined
                  }
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.header}</span>
                    {isSorted && (
                      <span className={styles.sortIndicator}>
                        {activeSort.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className={styles.body}>
          {sortedData.length > 0 ? (
            sortedData.map((row) => (
              <tr
                key={String(row[keyField])}
                className={clsx(
                  styles.row,
                  onRowClick ? styles.rowClickable : undefined,
                )}
                onClick={() => onRowClick && onRowClick(row)}
                role={onRowClick ? 'button' : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={(e) => handleRowKeyDown(e, row)}
              >
                {columns.map((column) => (
                  <td
                    key={column.id ?? column.header}
                    className={clsx(styles.cell, column.className)}
                  >
                    {getCellValue(row, column.accessor) as React.ReactNode}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className={styles.emptyCell}>
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;
