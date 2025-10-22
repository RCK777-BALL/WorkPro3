/*
 * SPDX-License-Identifier: MIT
 */

import type { MouseEvent } from 'react';

import AssetItem from './AssetItem';
import type { AssetNode, ContextTarget } from './hierarchyTypes';

interface AssetCategoryProps {
  title: string;
  assets: AssetNode[];
  selectedAssetId: string | null;
  onSelectAsset: (asset: AssetNode) => void;
  onContextMenu: (event: MouseEvent, target: ContextTarget) => void;
}

const AssetCategory = ({
  title,
  assets,
  selectedAssetId,
  onSelectAsset,
  onContextMenu,
}: AssetCategoryProps) => {
  if (assets.length === 0) return null;

  return (
    <div className="mb-3 rounded-lg bg-slate-900/40 p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</p>
        <span className="text-xs text-slate-500">{assets.length}</span>
      </div>
      <div className="space-y-1">
        {assets.map((asset) => (
          <AssetItem
            key={asset._id}
            asset={asset}
            isSelected={selectedAssetId === asset._id}
            onSelect={onSelectAsset}
            onContextMenu={onContextMenu}
          />
        ))}
      </div>
    </div>
  );
};

export default AssetCategory;
