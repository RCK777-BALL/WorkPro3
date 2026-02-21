/*
 * SPDX-License-Identifier: MIT
 */

import React, { useEffect, useMemo, useState } from 'react';
import { History, QrCode, Wrench } from 'lucide-react';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import DuplicateButton from '@/components/common/DuplicateButton';
import type { Asset } from '@/types';

const formatCriticality = (value?: Asset['criticality']) => {
  if (!value) return 'Criticality: N/A';
  return `Criticality: ${value.charAt(0).toUpperCase()}${value.slice(1)}`;
};

const formatHealth = (value?: string) => (value ? `Health: ${value}` : 'Health: N/A');

const formatLastMaintenance = (asset: Asset) => {
  const lastDate = asset.lastMaintenanceDate ?? asset.lastPmDate ?? asset.lastServiced;
  return lastDate ? `Last maintenance: ${lastDate}` : 'Last maintenance: N/A';
};

const formatOpenWorkOrders = (value?: number) =>
  typeof value === 'number' ? `${value} open WO${value === 1 ? '' : 's'}` : 'Open WOs: N/A';

const formatDowntime = (value?: number) =>
  typeof value === 'number' ? `Recent downtime: ${value}h` : 'Recent downtime: N/A';

const formatHours = (value?: number) => (typeof value === 'number' ? `${value}h` : 'N/A');

interface AssetTableProps {
  assets: Asset[];
  search: string;
  statusFilter?: string;
  criticalityFilter?: string;
  onRowClick: (asset: Asset) => void;
  onDuplicate: (asset: Asset) => void;
  onDelete: (asset: Asset) => void;
  onCreateWorkOrder?: (asset: Asset) => void;
  onViewMaintenance?: (asset: Asset) => void;
  onViewQrCode?: (asset: Asset) => void;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  canEdit?: boolean;
  canDelete?: boolean;
  canCreateWorkOrder?: boolean;
  readOnlyReason?: string;
}

const AssetTable: React.FC<AssetTableProps> = ({
  assets,
  search,
  statusFilter,
  criticalityFilter,
  onRowClick,
  onDuplicate,
  onDelete,
  onCreateWorkOrder,
  onViewMaintenance,
  onViewQrCode,
  selectedIds,
  onSelectionChange,
  canEdit = true,
  canDelete = true,
  canCreateWorkOrder = true,
  readOnlyReason,
}) => {
  const isSelectionControlled = selectedIds !== undefined;
  const [internalSelection, setInternalSelection] = useState<string[]>(() => selectedIds ?? []);

  useEffect(() => {
    if (isSelectionControlled) {
      setInternalSelection(selectedIds ?? []);
    }
  }, [isSelectionControlled, selectedIds]);

  const filteredAssets = useMemo(() => {
    const normalizedSearch = search.toLowerCase();
    const matchesSearch = (asset: Asset) =>
      Object.values(asset).some((value) => String(value ?? '').toLowerCase().includes(normalizedSearch));

    return assets.filter((asset) => {
      const matchesStatus = !statusFilter || (asset.status ?? '').toLowerCase() === statusFilter.toLowerCase();
      const matchesCriticality =
        !criticalityFilter || (asset.criticality ?? '').toLowerCase() === criticalityFilter.toLowerCase();

      return matchesStatus && matchesCriticality && matchesSearch(asset);
    });
  }, [assets, criticalityFilter, search, statusFilter]);

  const activeSelection = isSelectionControlled ? selectedIds ?? [] : internalSelection;
  const selectedSet = useMemo(() => new Set(activeSelection), [activeSelection]);

  const toggleRow = (id: string) => {
    const nextSelection = selectedSet.has(id)
      ? activeSelection.filter((item) => item !== id)
      : [...activeSelection, id];
    if (!isSelectionControlled) {
      setInternalSelection(nextSelection);
    }
    onSelectionChange?.(nextSelection);
  };

  const toggleAll = () => {
    const ids = filteredAssets.map((asset) => asset.id);
    const allSelected = ids.every((id) => selectedSet.has(id));
    const nextSelection = allSelected
      ? activeSelection.filter((id) => !ids.includes(id))
      : Array.from(new Set([...activeSelection, ...ids]));
    if (!isSelectionControlled) {
      setInternalSelection(nextSelection);
    }
    onSelectionChange?.(nextSelection);
  };

  const allVisibleSelected = filteredAssets.length > 0 && filteredAssets.every((asset) => selectedSet.has(asset.id));

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--wp-color-border)] bg-[color-mix(in_srgb,var(--wp-color-surface)_75%,transparent)] shadow-xl shadow-black/25">
      <div className="md:hidden">
        {filteredAssets.map((asset) => {
          const statusText = asset.status?.trim() || 'Unknown';
          const criticality = asset.criticality ?? 'low';
          const health = asset.health ?? 'good';
          const lastMaintenance = asset.lastMaintenanceDate || asset.lastServiced || 'N/A';
          const openWorkOrders = asset.openWorkOrders ?? 0;
          const downtime = asset.recentDowntimeHours ?? 0;

          return (
            <div
              key={asset.id}
              className="border-b border-[var(--wp-color-border)] px-4 py-4"
              role="button"
              tabIndex={0}
              onClick={() => onRowClick(asset)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onRowClick(asset);
                }
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--wp-color-text)]">{asset.name}</p>
                  <p className="text-xs text-[var(--wp-color-text-muted)]">{asset.type || 'Type not set'}</p>
                </div>
                <Badge text={statusText} type="status" size="sm" />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge text={formatCriticality(criticality)} type="priority" size="sm" />
                <Badge text={formatHealth(health)} type="status" size="sm" />
                <Badge text={formatLastMaintenance(asset)} size="sm" />
                <Badge text={formatOpenWorkOrders(openWorkOrders)} size="sm" />
                <Badge text={formatDowntime(downtime)} size="sm" />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {onCreateWorkOrder && canCreateWorkOrder && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                      e.stopPropagation();
                      onCreateWorkOrder(asset);
                    }}
                    icon={<Wrench className="h-4 w-4" />}
                  >
                    New WO
                  </Button>
                )}
                <DuplicateButton
                  onClick={() => onDuplicate(asset)}
                  disabled={!canEdit}
                  aria-label={canEdit ? 'Duplicate asset' : 'Duplicate disabled - insufficient permissions'}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!canDelete}
                  aria-disabled={!canDelete}
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.stopPropagation();
                    if (!canDelete) return;
                    onDelete(asset);
                  }}
                >
                  Delete
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!canEdit}
                  aria-disabled={!canEdit}
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.stopPropagation();
                    if (canEdit) onRowClick(asset);
                  }}
                >
                  Edit
                </Button>
              </div>
              <div className="mt-3 text-xs text-[var(--wp-color-text-muted)]">
                Location: {asset.location || 'N/A'} | Department: {asset.department || 'N/A'}
              </div>
              <div className="mt-1 flex items-center gap-4 text-xs text-[var(--wp-color-text-muted)]">
                <span>MTBF {formatHours(asset.reliability?.mtbfHours)}</span>
                <span>MTTR {formatHours(asset.reliability?.mttrHours)}</span>
                <span>Downtime {asset.downtimeCount ?? 0}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full divide-y divide-[var(--wp-color-border)]">
          <thead className="bg-[color-mix(in_srgb,var(--wp-color-surface)_85%,transparent)]">
            <tr>
              {onSelectionChange && (
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--wp-color-text-muted)]">
                  <input
                    aria-label={allVisibleSelected ? 'Deselect all visible assets' : 'Select all visible assets'}
                    type="checkbox"
                    className="h-4 w-4 rounded border-[var(--wp-color-border)] bg-[var(--wp-color-surface)] text-indigo-500"
                    checked={allVisibleSelected}
                    onChange={toggleAll}
                  />
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--wp-color-text-muted)]">Asset</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--wp-color-text-muted)]">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--wp-color-text-muted)]">Criticality / Health</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--wp-color-text-muted)]">Location</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--wp-color-text-muted)]">Department</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--wp-color-text-muted)]">Last Maintenance</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--wp-color-text-muted)]">Open WOs</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--wp-color-text-muted)]">Recent Downtime</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--wp-color-text-muted)]">Reliability</th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--wp-color-text-muted)]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--wp-color-border)] bg-[color-mix(in_srgb,var(--wp-color-surface)_70%,transparent)]">
            {filteredAssets.map((asset) => {
              const statusText = asset.status?.trim() || 'Unknown';
              const criticality = asset.criticality ?? 'low';
              const health = asset.health ?? 'good';
              const lastMaintenance = asset.lastMaintenanceDate || asset.lastServiced || 'N/A';
              const openWorkOrders = asset.openWorkOrders ?? 0;
              const downtime = asset.recentDowntimeHours ?? 0;

              return (
                <tr
                  key={asset.id}
                  className={`cursor-pointer transition-colors duration-150 hover:bg-[var(--wp-color-surface-elevated)] ${selectedSet.has(asset.id) ? 'bg-[var(--wp-color-surface-elevated)]' : ''}`}
                  onClick={() => onRowClick(asset)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onRowClick(asset);
                    }
                  }}
                  aria-label={`View or edit ${asset.name}`}
                >
                  {onSelectionChange && (
                    <td className="px-4 py-4 whitespace-nowrap align-middle">
                      <input
                        aria-label={`Select ${asset.name}`}
                        type="checkbox"
                        className="h-4 w-4 rounded border-[var(--wp-color-border)] bg-[var(--wp-color-surface)] text-indigo-500"
                        checked={selectedSet.has(asset.id)}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => toggleRow(asset.id)}
                      />
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 h-10 w-10">
                        {asset.image ? (
                          <img className="h-10 w-10 rounded-lg object-cover" src={asset.image} alt={asset.name} />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--wp-color-surface-elevated)]">
                            <span className="text-sm font-medium text-[var(--wp-color-text)]">
                              {asset.name.substring(0, 2).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[var(--wp-color-text)]">{asset.name}</p>
                        <p className="text-xs text-[var(--wp-color-text-muted)]">{asset.type || 'Type not set'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge text={statusText} type="status" size="sm" />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--wp-color-text-muted)]">
                    <div className="flex flex-col gap-1">
                      <Badge text={formatCriticality(criticality)} type="priority" size="sm" />
                      <Badge text={formatHealth(health)} type="status" size="sm" />
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--wp-color-text-muted)]">{asset.location || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--wp-color-text-muted)]">{asset.department || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--wp-color-text-muted)]">{lastMaintenance}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--wp-color-text-muted)]">
                    <Badge text={formatOpenWorkOrders(openWorkOrders)} size="sm" />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--wp-color-text-muted)]">
                    <Badge text={formatDowntime(downtime)} size="sm" />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--wp-color-text-muted)]">
                    <div className="flex flex-col gap-1 text-xs text-[var(--wp-color-text-muted)]">
                      <div className="flex items-center gap-1" title="Mean time between failures in hours">
                        <span className="text-[var(--wp-color-text-muted)]">MTBF</span>
                        <span className="font-semibold text-[var(--wp-color-text)]">{formatHours(asset.reliability?.mtbfHours)}</span>
                      </div>
                      <div className="flex items-center gap-1" title="Mean time to repair in hours">
                        <span className="text-[var(--wp-color-text-muted)]">MTTR</span>
                        <span className="font-semibold text-[var(--wp-color-text)]">{formatHours(asset.reliability?.mttrHours)}</span>
                      </div>
                      <div className="flex items-center gap-1" title="Number of recorded downtime events">
                        <span className="text-[var(--wp-color-text-muted)]">Downtime</span>
                        <span className="font-semibold text-[var(--wp-color-text)]">{asset.downtimeCount ?? 0}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right align-top">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {onCreateWorkOrder && canCreateWorkOrder && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                            e.stopPropagation();
                            onCreateWorkOrder(asset);
                          }}
                          aria-label="Create work order"
                          icon={<Wrench className="h-4 w-4" />}
                        >
                          New WO
                        </Button>
                      )}
                      {onViewMaintenance && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                            e.stopPropagation();
                            onViewMaintenance(asset);
                          }}
                          aria-label="View maintenance history"
                          icon={<History className="h-4 w-4" />}
                        >
                          History
                        </Button>
                      )}
                      {onViewQrCode && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                            e.stopPropagation();
                            onViewQrCode(asset);
                          }}
                          aria-label="View QR code"
                          icon={<QrCode className="h-4 w-4" />}
                        >
                          QR
                        </Button>
                      )}
                      <DuplicateButton
                        onClick={() => onDuplicate(asset)}
                        disabled={!canEdit}
                        aria-label={canEdit ? 'Duplicate asset' : 'Duplicate disabled - insufficient permissions'}
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={!canDelete}
                        aria-disabled={!canDelete}
                        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                          e.stopPropagation();
                          if (!canDelete) return;
                          onDelete(asset);
                        }}
                      >
                        Delete
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={!canEdit}
                        aria-disabled={!canEdit}
                        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                          e.stopPropagation();
                          if (canEdit) onRowClick(asset);
                        }}
                      >
                        Edit
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filteredAssets.length === 0 && (
        <div className="py-12 text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-[var(--wp-color-surface-elevated)]">
            <svg className="h-8 w-8 text-[var(--wp-color-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          </div>
          <p className="text-[var(--wp-color-text-muted)]">No assets found</p>
        </div>
      )}
      {!canEdit && readOnlyReason && (
        <div className="border-t border-[var(--wp-color-border)] bg-[color-mix(in_srgb,var(--wp-color-surface)_75%,transparent)] px-6 py-3 text-left text-xs text-amber-200" role="note">
          {readOnlyReason}
        </div>
      )}
    </div>
  );
};

export default AssetTable;

