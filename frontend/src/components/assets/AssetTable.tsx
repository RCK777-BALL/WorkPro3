/*
 * SPDX-License-Identifier: MIT
 */

import React from 'react';
import Badge from '@common/Badge';
import Button from '@common/Button';
import DuplicateButton from '@common/DuplicateButton';
import type { Asset } from '@/types';

export interface AssetFilters {
  status?: string;
  criticality?: string;
}

interface AssetTableProps {
  assets: Asset[];
  search: string;
  onRowClick: (asset: Asset) => void;
  onDuplicate: (asset: Asset) => void;
  onDelete: (asset: Asset) => void;
  onCreateWorkOrder?: (asset: Asset) => void;
  canEdit?: boolean;
  canDelete?: boolean;
  canCreateWorkOrder?: boolean;
  readOnlyReason?: string;
  filters?: AssetFilters;
}

const AssetTable: React.FC<AssetTableProps> = ({
  assets,
  search,
  onRowClick,
  onDuplicate,
  onDelete,
  onCreateWorkOrder,
  canEdit = true,
  canDelete = true,
  canCreateWorkOrder = true,
  readOnlyReason,
  filters = {},
}) => {
  const normalizeSearch = search.trim().toLowerCase();

  const filteredAssets = assets.filter((asset) => {
    const matchesSearch = Object.values(asset).some((value) =>
      String(value).toLowerCase().includes(normalizeSearch)
    );

    const matchesStatus = (() => {
      if (!filters.status || filters.status === 'all') return true;
      return (asset.status ?? '').toLowerCase() === filters.status.toLowerCase();
    })();

    const matchesCriticality = (() => {
      if (!filters.criticality || filters.criticality === 'all') return true;
      return (asset.criticality ?? '').toLowerCase() === filters.criticality.toLowerCase();
    })();

    return matchesSearch && matchesStatus && matchesCriticality;
  });

  const formatMaintenanceDate = (value?: string) => {
    if (!value) return 'N/A';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString();
  };

  const getHealthBadgeTone = (value?: number) => {
    if (value === undefined || value === null || Number.isNaN(value)) {
      return 'bg-slate-800 text-slate-200 border border-slate-700';
    }
    if (value >= 80) return 'bg-emerald-500/15 text-emerald-200 border border-emerald-500/30';
    if (value >= 50) return 'bg-amber-500/15 text-amber-200 border border-amber-500/30';
    return 'bg-rose-500/15 text-rose-200 border border-rose-500/30';
  };

  return (
    <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900/80 text-slate-100 shadow-sm backdrop-blur">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-800">
          <thead className="bg-slate-900/80">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-300">
                Asset
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-300">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-300">
                Location
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-300">
                Department
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-300">
                Reliability
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-300">
                Maintenance
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-300">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 bg-slate-900/60">
            {filteredAssets.map((asset) => {
              const statusText = asset.status?.trim() || 'Unknown';
              const criticalityText = asset.criticality
                ? `${asset.criticality.charAt(0).toUpperCase()}${asset.criticality.slice(1)} criticality`
                : 'Criticality not set';
              const healthValue = asset.healthScore ?? asset.health;
              const normalizedHealth =
                typeof healthValue === 'number'
                  ? healthValue
                  : Number.isFinite(Number(healthValue))
                    ? Number(healthValue)
                    : undefined;
              const healthText =
                normalizedHealth !== undefined && normalizedHealth !== null
                  ? `${Math.round(normalizedHealth)}% health`
                  : 'Health pending';
              const lastMaintenance =
                asset.lastMaintenanceDate ?? asset.lastServiced ?? asset.lastPmDate;
              const openWorkOrders = asset.openWorkOrders ?? asset.openWorkOrderCount ?? 0;
              const downtime = asset.recentDowntimeHours ?? asset.downtimeHours;
              const downtimeText =
                downtime === undefined || downtime === null
                  ? 'Downtime n/a'
                  : `${downtime}h recent downtime`;

              return (
                <tr
                  key={asset.id}
                  className="cursor-pointer transition-colors duration-150 hover:bg-slate-800/70"
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
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge text={statusText} type="status" size="sm" />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                  {asset.location}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                  {asset.department}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge text={criticalityText} type="priority" size="sm" />
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getHealthBadgeTone(normalizedHealth)}`}
                    >
                      {healthText}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      text={`Last maintenance: ${formatMaintenanceDate(lastMaintenance)}`}
                      size="sm"
                      className="bg-blue-500/15 text-blue-200 border border-blue-500/30"
                    />
                    <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-100">
                      Open WO: {openWorkOrders}
                    </span>
                    <span className="inline-flex items-center rounded-full border border-indigo-700/60 bg-indigo-800/60 px-2.5 py-1 text-xs font-medium text-indigo-100">
                      {downtimeText}
                    </span>
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
