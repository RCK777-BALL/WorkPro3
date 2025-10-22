/*
 * SPDX-License-Identifier: MIT
 */

import { AnimatePresence, motion } from 'framer-motion';
import { Cpu, ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { useMemo } from 'react';
import type { MouseEvent } from 'react';

import AssetCategory from './AssetCategory';
import type { AssetNode, ContextTarget, StationNode } from './hierarchyTypes';

interface StationTreeProps {
  station: StationNode;
  isExpanded: boolean;
  onToggle: () => void;
  onAddAsset: () => void;
  onSelectAsset: (asset: AssetNode) => void;
  onContextMenu: (event: MouseEvent, target: ContextTarget) => void;
  selectedAssetId: string | null;
  onEdit: () => void;
}

const containerVariants = {
  collapsed: { height: 0, opacity: 0 },
  expanded: { height: 'auto', opacity: 1 },
};

const categoryOrder = ['Electrical', 'Mechanical', 'Tooling', 'Interface'];

const StationTree = ({
  station,
  isExpanded,
  onToggle,
  onAddAsset,
  onSelectAsset,
  onContextMenu,
  selectedAssetId,
  onEdit,
}: StationTreeProps) => {
  const categorizedAssets = useMemo(() => {
    const groups = new Map<string, AssetNode[]>();
    station.assets.forEach((asset) => {
      const key = asset.type || 'Uncategorized';
      const current = groups.get(key) ?? [];
      current.push(asset);
      groups.set(key, current);
    });
    categoryOrder.forEach((category) => {
      if (!groups.has(category)) groups.set(category, []);
    });
    return groups;
  }, [station.assets]);

  return (
    <div className="border-l border-slate-800 pl-4">
      <div
        onClick={onToggle}
        onDoubleClick={(event) => {
          event.stopPropagation();
          onEdit();
        }}
        onContextMenu={(event) => {
          event.preventDefault();
          onContextMenu(event, {
            type: 'station',
            stationId: station._id,
            name: station.name,
          });
        }}
        className="group flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 text-slate-200 transition hover:bg-slate-800/50"
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-sky-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-sky-400" />
        )}
        <div className="flex items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/10 text-sky-300">
            <Cpu className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-medium text-slate-100">{station.name}</p>
            {station.notes && <p className="text-xs text-slate-400 line-clamp-1">{station.notes}</p>}
          </div>
        </div>
        <button
          type="button"
          className="ml-auto hidden items-center gap-1 rounded-md bg-sky-600/80 px-2 py-1 text-xs font-medium text-white transition group-hover:flex hover:bg-sky-500"
          onClick={(event) => {
            event.stopPropagation();
            onAddAsset();
          }}
        >
          <Plus className="h-3 w-3" /> Asset
        </button>
      </div>
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key={`${station._id}-assets`}
            initial="collapsed"
            animate="expanded"
            exit="collapsed"
            variants={containerVariants}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="pl-5"
          >
            {Array.from(categorizedAssets.entries()).map(([category, assets]) => (
              <AssetCategory
                key={`${station._id}-${category}`}
                title={category}
                assets={assets}
                selectedAssetId={selectedAssetId}
                onSelectAsset={onSelectAsset}
                onContextMenu={onContextMenu}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StationTree;
