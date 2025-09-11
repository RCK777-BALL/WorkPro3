/*
 * SPDX-License-Identifier: MIT
 */

import React, { useState } from 'react';

interface Column<T> {
  header: string;
  accessor: keyof T | ((row: T) => React.ReactNode);
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField: keyof T;
  onRowClick?: (row: T) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  className?: string;
}

function DataTable<T>({
  columns,
  data,
  keyField,
  onRowClick,
  isLoading = false,
  emptyMessage = 'No data available',
  className = '',
}: DataTableProps<T>) {
  const [sortColumn, setSortColumn] = useState<keyof T | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

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

  const handleSort = (column: keyof T | ((row: T) => React.ReactNode)) => {
    if (typeof column === 'function') return;
    
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getCellValue = (row: T, accessor: keyof T | ((row: T) => React.ReactNode)) => {
    if (typeof accessor === 'function') {
      return accessor(row);
    }
    return row[accessor];
  };

  const sortedData = React.useMemo(() => {
    if (!sortColumn) return data;
    
    return [...data].sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];
      
      if (aValue === bValue) return 0;
      
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;
      
      const comparison = String(aValue).localeCompare(String(bValue));
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [data, sortColumn, sortDirection]);

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
    <div className={`overflow-x-auto ${className}`}>
      <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
        <thead className="bg-neutral-50 dark:bg-neutral-800">
          <tr>
            {columns.map((column) => (
              <th
                key={column.header}
                scope="col"
                className={`px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider cursor-pointer focus-visible:ring-2 focus-visible:ring-primary-500 dark:focus-visible:ring-primary-300 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900 ${column.className || ''}`}
                onClick={() => typeof column.accessor !== 'function' && handleSort(column.accessor)}
                tabIndex={typeof column.accessor !== 'function' ? 0 : undefined}
                onKeyDown={(e) => handleHeaderKeyDown(e, column.accessor)}
                aria-sort={
                  sortColumn === column.accessor
                    ? sortDirection === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : 'none'
                }
              >
                <div className="flex items-center space-x-1">
                  <span>{column.header}</span>
                  {sortColumn === column.accessor && (
                    <span>
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-700">
          {sortedData.length > 0 ? (
            sortedData.map((row) => (
              <tr
                key={String(row[keyField])}
                className={onRowClick ? 'hover:bg-neutral-50 dark:hover:bg-neutral-700 cursor-pointer transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-primary-500 dark:focus-visible:ring-primary-300 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900' : ''}
                onClick={() => onRowClick && onRowClick(row)}
                role={onRowClick ? 'button' : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={(e) => handleRowKeyDown(e, row)}
              >
                {columns.map((column) => (
                  <td key={column.header} className={`px-6 py-4 whitespace-nowrap text-sm text-neutral-900 dark:text-neutral-200 ${column.className || ''}`}>
                    {getCellValue(row, column.accessor) as React.ReactNode}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="px-6 py-10 text-center text-sm text-neutral-500 dark:text-neutral-400">
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
