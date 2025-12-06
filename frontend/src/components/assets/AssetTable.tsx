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
  selectedIds = [],
  onSelectionChange,
  canEdit = true,
  canDelete = true,
  canCreateWorkOrder = true,
  readOnlyReason,
}) => {
  const [internalSelection, setInternalSelection] = useState<string[]>(selectedIds);

  useEffect(() => {
    setInternalSelection(selectedIds);
  }, [selectedIds]);

  const filteredAssets = useMemo(
    () =>
      assets.filter((asset) =>
        Object.values(asset).some((value) =>
          String(value).toLowerCase().includes(search.toLowerCase())
        )
      ),
    [assets, search]
  );

  const selectedSet = new Set(internalSelection);
  const allVisibleSelected =
    filteredAssets.length > 0 && filteredAssets.every((asset) => selectedSet.has(asset.id));

  const emitSelectionChange = (ids: string[]) => {
    setInternalSelection(ids);
    onSelectionChange?.(ids);
  };

  const toggleRow = (assetId: string) => {
    if (!onSelectionChange) return;
    const nextSelection = selectedSet.has(assetId)
      ? internalSelection.filter((id) => id !== assetId)
      : [...internalSelection, assetId];
    emitSelectionChange(nextSelection);
  };

  const toggleAll = () => {
    if (!onSelectionChange) return;
    const visibleIds = filteredAssets.map((asset) => asset.id);
    if (allVisibleSelected) {
      emitSelectionChange(internalSelection.filter((id) => !visibleIds.includes(id)));
    } else {
      emitSelectionChange(Array.from(new Set([...internalSelection, ...visibleIds])));
    }
  };

  return (
    <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900/80 text-slate-100 shadow-sm backdrop-blur">
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
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-300">
                Asset
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-300">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-300">
                Criticality / Health
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-300">
                Location
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-300">
                Department
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-300">
                Last Maintenance
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-300">
                Open WOs
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-300">
                Recent Downtime
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-300">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 bg-slate-900/60">
            {filteredAssets.map((asset) => {
              const statusText = asset.status?.trim() || 'Unknown';

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
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      {asset.image ? (
                        <img
                          className="h-10 w-10 rounded-lg object-cover"
                          src={asset.image}
                          alt={asset.name}
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800">
                          <span className="text-sm font-medium text-slate-200">
                            {asset.name.substring(0, 2).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-slate-100">
                        {asset.name}
                      </div>
                      <div className="text-sm text-slate-400">
                        {asset.serialNumber}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge text={formatCriticality(asset.criticality)} type="priority" size="sm" />
                        <Badge text={formatHealth(asset.health)} type="status" size="sm" />
                        <Badge text={formatLastMaintenance(asset)} size="sm" />
                        <Badge text={formatOpenWorkOrders(asset.openWorkOrders)} size="sm" />
                        <Badge text={formatDowntime(asset.recentDowntimeHours)} size="sm" />
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge text={statusText} type="status" size="sm" />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                  <div className="flex flex-col gap-1">
                    <Badge
                      text={asset.criticality ? asset.criticality : 'N/A'}
                      type="priority"
                      size="sm"
                    />
                    <Badge text={getHealthBadge(asset)} size="sm" />
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                  {asset.location}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                  {asset.department}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                  {asset.lastMaintenanceDate || asset.lastServiced || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                  <Badge
                    text={`${asset.openWorkOrders ?? 0} open`}
                    type={(asset.openWorkOrders ?? 0) > 0 ? 'status' : 'default'}
                    size="sm"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                  <Badge
                    text={`${asset.downtimeHoursLast30Days ?? 0}h`}
                    type={(asset.downtimeHoursLast30Days ?? 0) > 0 ? 'status' : 'default'}
                    size="sm"
                  />
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
                      onClick={() => canEdit && onRowClick(asset)}
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
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
