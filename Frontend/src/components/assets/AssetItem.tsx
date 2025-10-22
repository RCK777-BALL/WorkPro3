/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useRef } from 'react';
import { Circle } from 'lucide-react';
import type { MouseEvent } from 'react';

import type { AssetNode, ContextTarget } from './hierarchyTypes';

interface AssetItemProps {
  asset: AssetNode;
  isSelected: boolean;
  onSelect: (asset: AssetNode) => void;
  onContextMenu: (event: MouseEvent, target: ContextTarget) => void;
}

const statusColors: Record<string, string> = {
  active: 'text-emerald-400',
  offline: 'text-amber-400',
  'in repair': 'text-rose-400',
};

const AssetItem = ({ asset, isSelected, onSelect, onContextMenu }: AssetItemProps) => {
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isSelected) {
      ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isSelected]);

  const statusClass = asset.status ? statusColors[asset.status.toLowerCase()] ?? 'text-slate-400' : 'text-slate-500';

  return (
    <button
      ref={ref}
      type="button"
      onClick={() => onSelect(asset)}
      onContextMenu={(event) => {
        event.preventDefault();
        onContextMenu(event, {
          type: 'asset',
          assetId: asset._id,
          name: asset.name,
        });
      }}
      className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition ${
        isSelected ? 'bg-indigo-600/40 text-white ring-2 ring-indigo-400/70' : 'text-slate-200 hover:bg-slate-800/70'
      }`}
    >
      <Circle className={`h-3 w-3 ${statusClass}`} fill="currentColor" />
      <div className="flex-1">
        <p className="text-sm font-medium">{asset.name}</p>
        <div className="text-xs text-slate-400">
          <span className="capitalize">{asset.type}</span>
          {asset.criticality && <span className="ml-2 uppercase">{asset.criticality}</span>}
        </div>
      </div>
    </button>
  );
};

export default AssetItem;
