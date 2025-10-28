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
}

const AssetTable: React.FC<AssetTableProps> = ({
  assets,
  search,
  onRowClick,
  onDuplicate,
  onDelete,
  onCreateWorkOrder,
}) => {
  const filteredAssets = assets.filter((asset) =>
    Object.values(asset).some((value) =>
      String(value).toLowerCase().includes(search.toLowerCase())
    )
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-neutral-200">
          <thead className="bg-neutral-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">
                Asset
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">
                Location
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">
                Department
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">
                Last Serviced
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">
                Warranty Expiry
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-neutral-200">
            {filteredAssets.map((asset) => (
              <tr
                key={asset.id}
                className="hover:bg-neutral-50 cursor-pointer transition-colors duration-150"
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
                        <div className="h-10 w-10 rounded-lg bg-neutral-100 flex items-center justify-center">
                          <span className="text-neutral-600 text-sm font-medium dark:text-neutral-300">
                            {asset.name.substring(0, 2).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                        {asset.name}
                      </div>
                      <div className="text-sm text-neutral-600 dark:text-neutral-400">
                        {asset.serialNumber}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge
                    text={asset.status}
                    type="status"
                    size="sm"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-700 dark:text-neutral-300">
                  {asset.location}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-700 dark:text-neutral-300">
                  {asset.department}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-700 dark:text-neutral-300">
                  {asset.lastServiced || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-700 dark:text-neutral-300">
                  {asset.warrantyExpiry || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className="flex items-center justify-end space-x-2">
                    {onCreateWorkOrder && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                          e.stopPropagation();
                          onCreateWorkOrder(asset);
                        }}
                      >
                        New WO
                      </Button>
                    )}
                    <DuplicateButton
                      onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                        e.stopPropagation();
                        onDuplicate(asset);
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                        e.stopPropagation();
                        onDelete(asset);
                      }}
                    >
                      Delete
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRowClick(asset)}
                    >
                      Edit
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {filteredAssets.length === 0 && (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-neutral-100 mb-4">
            <svg className="h-8 w-8 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-neutral-500">No assets found</p>
        </div>
      )}
    </div>
  );
};

export default AssetTable;
