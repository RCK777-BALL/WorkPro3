/*
 * SPDX-License-Identifier: MIT
 */

import React from 'react';
import Badge from '@common/Badge';
import Button from '@common/Button';
import DuplicateButton from '@common/DuplicateButton';
import type { Asset } from '@/types';

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
}) => {
  const [hoveredAssetId, setHoveredAssetId] = React.useState<string | null>(null);

  const filteredAssets = assets.filter((asset) =>
    Object.values(asset).some((value) =>
      String(value).toLowerCase().includes(search.toLowerCase())
    )
  );

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
                Last Serviced
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-300">
                Warranty Expiry
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
                <React.Fragment key={asset.id}>
                  <tr
                    className="cursor-pointer transition-colors duration-150 hover:bg-slate-800/70"
                    onClick={() => onRowClick(asset)}
                    role="button"
                    tabIndex={0}
                    onMouseEnter={() => setHoveredAssetId(asset.id)}
                    onMouseLeave={() => setHoveredAssetId((current) => (current === asset.id ? null : current))}
                    onFocus={() => setHoveredAssetId(asset.id)}
                    onBlur={(event) => {
                      if (!event.currentTarget.contains(event.relatedTarget)) {
                        setHoveredAssetId((current) => (current === asset.id ? null : current));
                      }
                    }}
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
                      {asset.lastServiced || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                      {asset.warrantyEnd || asset.warrantyExpiry || 'N/A'}
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

                  {hoveredAssetId === asset.id && (
                    <tr
                      className="bg-slate-950/70"
                      onMouseEnter={() => setHoveredAssetId(asset.id)}
                      onMouseLeave={() => setHoveredAssetId((current) => (current === asset.id ? null : current))}
                    >
                      <td colSpan={7} className="px-6 pb-6 pt-2">
                        <div className="rounded-xl border border-slate-800/80 bg-slate-900/80 p-4 shadow-lg shadow-slate-950/40">
                          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            <div className="space-y-1 rounded-lg border border-slate-800/60 bg-slate-950/40 p-3">
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Location</p>
                              <p className="text-sm text-slate-100">{asset.location || 'Not set'}</p>
                              {asset.assignee || asset.assignedTo ? (
                                <p className="text-xs text-slate-400">Assignee: {asset.assignee || asset.assignedTo}</p>
                              ) : (
                                <p className="text-xs text-slate-500">Unassigned</p>
                              )}
                            </div>

                            <div className="space-y-2 rounded-lg border border-slate-800/60 bg-slate-950/40 p-3">
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Warranty</p>
                              <p className="text-sm text-slate-100">
                                {asset.warrantyEnd || asset.warrantyExpiry || 'No warranty date'}
                              </p>
                              <p className="text-xs text-slate-500">Track expirations to plan service.</p>
                            </div>

                            <div className="space-y-2 rounded-lg border border-slate-800/60 bg-slate-950/40 p-3">
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Next PM</p>
                              <p className="text-sm text-slate-100">{asset.nextPmDate || asset.lastPmDate || 'Not scheduled'}</p>
                              <p className="text-xs text-slate-500">Keep preventive maintenance on track.</p>
                            </div>

                            <div className="space-y-2 rounded-lg border border-slate-800/60 bg-slate-950/40 p-3 md:col-span-2 xl:col-span-3">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Key meters</p>
                                <span className="text-[11px] font-medium text-slate-500">Live utilization signals</span>
                              </div>
                              {asset.keyMeters && asset.keyMeters.length > 0 ? (
                                <div className="flex flex-wrap gap-3">
                                  {asset.keyMeters.slice(0, 4).map((meter) => (
                                    <div
                                      key={`${meter.name}-${meter.unit ?? 'unit'}`}
                                      className="flex items-center gap-2 rounded-md border border-slate-800/80 bg-slate-950/50 px-3 py-2"
                                    >
                                      <div className="flex flex-col">
                                        <span className="text-xs font-medium text-slate-300">{meter.name}</span>
                                        <span className="text-sm font-semibold text-slate-100">
                                          {meter.value ?? '—'} {meter.unit && <span className="text-xs text-slate-400">{meter.unit}</span>}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-slate-400">No meter data recorded.</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
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
