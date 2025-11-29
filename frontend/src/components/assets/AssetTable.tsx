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
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 bg-slate-900/60">
            {filteredAssets.map((asset) => {
              const statusText = asset.status?.trim() || 'Unknown';

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
                  {asset.lastServiced || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                  {asset.warrantyExpiry || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className="flex items-center justify-end space-x-2">
                    {onCreateWorkOrder && canCreateWorkOrder && (
                      <Button
                        variant="ghost"
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
                      variant="ghost"
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
                      variant="ghost"
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
