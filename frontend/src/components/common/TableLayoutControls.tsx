/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Copy, RefreshCw, Save } from 'lucide-react';
import Button from './Button';
import type { SavedTableLayout } from '@/hooks/useTableLayout';

interface ColumnOption {
  id: string;
  label: string;
}

interface TableLayoutControlsProps {
  columns: ColumnOption[];
  columnOrder: string[];
  hiddenColumns: string[];
  onToggleColumn: (columnId: string) => void;
  onMoveColumn: (columnId: string, direction: 'up' | 'down') => void;
  onReset: () => void;
  onSaveLayout: (name: string) => SavedTableLayout | null;
  savedLayouts: SavedTableLayout[];
  onApplyLayout: (layoutId: string) => void;
  onShareLayout: (layoutId?: string) => string;
  activeLayoutId?: string;
}

const TableLayoutControls = ({
  columns,
  columnOrder,
  hiddenColumns,
  onToggleColumn,
  onMoveColumn,
  onReset,
  onSaveLayout,
  savedLayouts,
  onApplyLayout,
  onShareLayout,
  activeLayoutId,
}: TableLayoutControlsProps) => {
  const [layoutName, setLayoutName] = useState('');
  const [selectedLayoutId, setSelectedLayoutId] = useState<string | undefined>(activeLayoutId);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    setSelectedLayoutId(activeLayoutId);
  }, [activeLayoutId]);

  const orderedColumns = useMemo(
    () => columnOrder.map((id) => columns.find((column) => column.id === id)).filter(Boolean) as ColumnOption[],
    [columnOrder, columns],
  );

  const handleSave = () => {
    const saved = onSaveLayout(layoutName);
    if (saved) {
      setSelectedLayoutId(saved.id);
      setStatusMessage('Layout saved and applied.');
    }
  };

  const handleApply = (layoutId: string) => {
    if (!layoutId) return;
    onApplyLayout(layoutId);
    setSelectedLayoutId(layoutId);
    setStatusMessage('Layout applied.');
  };

  const handleShare = (layoutId?: string) => {
    const link = onShareLayout(layoutId);
    if (!link) return;

    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(link).catch(() => {
        setStatusMessage('Unable to copy link to clipboard');
      });
    }

    setStatusMessage('Shareable link ready to paste.');
  };

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">Table layout</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Choose columns, reorder them, and save layouts you can share.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" icon={<RefreshCw className="h-4 w-4" />} onClick={onReset}>
            Reset columns
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<Copy className="h-4 w-4" />}
            onClick={() => handleShare(selectedLayoutId)}
          >
            Copy share link
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Columns</p>
          <div className="divide-y divide-neutral-200 rounded-md border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
            {orderedColumns.map((column, index) => {
              const isHidden = hiddenColumns.includes(column.id);
              return (
                <div
                  key={column.id}
                  className="flex items-center justify-between gap-2 px-3 py-2 text-sm text-neutral-800 dark:text-neutral-100"
                >
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                      checked={!isHidden}
                      onChange={() => onToggleColumn(column.id)}
                    />
                    <span>{column.label}</span>
                  </label>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Move ${column.label} up`}
                      disabled={index === 0}
                      icon={<ArrowUp className="h-4 w-4" />}
                      onClick={() => onMoveColumn(column.id, 'up')}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Move ${column.label} down`}
                      disabled={index === orderedColumns.length - 1}
                      icon={<ArrowDown className="h-4 w-4" />}
                      onClick={() => onMoveColumn(column.id, 'down')}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              Save layout
            </label>
            <input
              type="text"
              value={layoutName}
              onChange={(e) => setLayoutName(e.target.value)}
              placeholder="Name this layout"
              className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-50"
            />
            <Button
              variant="primary"
              size="sm"
              fullWidth
              icon={<Save className="h-4 w-4" />}
              onClick={handleSave}
            >
              Save & apply
            </Button>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              Saved layouts
            </label>
            <select
              className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-50"
              value={selectedLayoutId ?? ''}
              onChange={(e) => handleApply(e.target.value)}
            >
              <option value="" disabled>
                Choose a layout
              </option>
              {savedLayouts.map((layout) => (
                <option key={layout.id} value={layout.id}>
                  {layout.name}
                </option>
              ))}
            </select>
          </div>

          {statusMessage ? (
            <p className="text-xs text-neutral-500 dark:text-neutral-400" role="status">
              {statusMessage}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default TableLayoutControls;
