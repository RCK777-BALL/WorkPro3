/*
 * SPDX-License-Identifier: MIT
 */

import React, { useEffect, useMemo, useState } from 'react';
import { History, QrCode, Wrench } from 'lucide-react';
import Badge from '@common/Badge';
import Button from '@common/Button';
import DuplicateButton from '@common/DuplicateButton';
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
    <div className="overflow-hidden rounded-lg border border-slate-800/60 bg-slate-900/70 shadow-xl shadow-slate-950/30">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-800">
          <thead className="bg-slate-900/80">
            <tr>
              {onSelectionChange && (
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-300">
                  <input
                    aria-label={allVisibleSelected ? 'Deselect all visible assets' : 'Select all visible assets'}
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-indigo-500"
                    checked={allVisibleSelected}
                    onChange={toggleAll}
                  />
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-300">Asset</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-300">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-300">Criticality / Health</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-300">Location</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-300">Department</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-300">Last Maintenance</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-300">Open WOs</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-300">Recent Downtime</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-300">Reliability</th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-300">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 bg-slate-900/60">
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
                  className={`cursor-pointer transition-colors duration-150 hover:bg-slate-800/70 ${selectedSet.has(asset.id) ? 'bg-slate-800/60' : ''}`}
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
                        className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-indigo-500"
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
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800">
                            <span className="text-sm font-medium text-slate-200">
                              {asset.name.substring(0, 2).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-100">{asset.name}</p>
                        <p className="text-xs text-slate-400">{asset.type || 'Type not set'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge text={statusText} type="status" size="sm" />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                    <div className="flex flex-col gap-1">
                      <Badge text={formatCriticality(criticality)} type="priority" size="sm" />
                      <Badge text={formatHealth(health)} type="status" size="sm" />
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{asset.location || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{asset.department || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{lastMaintenance}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                    <Badge text={formatOpenWorkOrders(openWorkOrders)} size="sm" />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                    <Badge text={formatDowntime(downtime)} size="sm" />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                    <div className="flex flex-col gap-1 text-xs text-slate-300">
                      <div className="flex items-center gap-1" title="Mean time between failures in hours">
                        <span className="text-slate-400">MTBF</span>
                        <span className="font-semibold text-slate-100">{formatHours(asset.reliability?.mtbfHours)}</span>
                      </div>
                      <div className="flex items-center gap-1" title="Mean time to repair in hours">
                        <span className="text-slate-400">MTTR</span>
                        <span className="font-semibold text-slate-100">{formatHours(asset.reliability?.mttrHours)}</span>
                      </div>
                      <div className="flex items-center gap-1" title="Number of recorded downtime events">
                        <span className="text-slate-400">Downtime</span>
                        <span className="font-semibold text-slate-100">{asset.downtimeCount ?? 0}</span>
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
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-slate-800">
            <svg className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          </div>
          <p className="text-slate-400">No assets found</p>
        </div>
      )}
      {!canEdit && readOnlyReason && (
        <div className="border-t border-slate-800 bg-slate-900/70 px-6 py-3 text-left text-xs text-amber-200" role="note">
          {readOnlyReason}
        </div>
      )}
    </div>
  );
};

export default AssetTable;
