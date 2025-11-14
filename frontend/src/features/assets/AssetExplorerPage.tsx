/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useMemo, useState } from 'react';

import AssetDetailPanel from './AssetDetailPanel';
import HierarchyTree from './HierarchyTree';
import { useAssetDetails, useHierarchyTree, useSelectedAssetSummary } from './hooks';
import type { HierarchyResponse } from '@/api/hierarchy';

const findFirstAssetId = (hierarchy?: HierarchyResponse): string | undefined => {
  if (!hierarchy) return undefined;
  for (const department of hierarchy.departments) {
    if (department.assets.length > 0) {
      return department.assets[0].id;
    }
    for (const line of department.lines) {
      if (line.assets.length > 0) {
        return line.assets[0].id;
      }
      for (const station of line.stations) {
        if (station.assets.length > 0) {
          return station.assets[0].id;
        }
      }
    }
  }
  return undefined;
};

const AssetExplorerPage = () => {
  const { data, isLoading, error } = useHierarchyTree();
  const [selectedAssetId, setSelectedAssetId] = useState<string | undefined>();
  const summary = useSelectedAssetSummary(selectedAssetId, data);
  const { data: assetDetails, isLoading: detailsLoading } = useAssetDetails(selectedAssetId);

  useEffect(() => {
    if (!selectedAssetId && data) {
      const initial = findFirstAssetId(data);
      if (initial) {
        setSelectedAssetId(initial);
      }
    }
  }, [data, selectedAssetId]);

  const subtitle = useMemo(() => {
    if (error instanceof Error) {
      return error.message;
    }
    return 'Navigate departments, lines, and stations to quickly locate asset records and supporting context.';
  }, [error]);

  return (
    <div className="space-y-6 p-6">
      <header>
        <p className="text-sm uppercase tracking-wide text-indigo-300">Assets</p>
        <h1 className="text-3xl font-bold text-white">Hierarchy Explorer</h1>
        <p className="text-sm text-neutral-400">{subtitle}</p>
      </header>
      <div className="grid gap-4 lg:grid-cols-[360px,1fr]">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950/60">
          <HierarchyTree
            data={data}
            isLoading={isLoading}
            selectedAssetId={selectedAssetId}
            onSelect={setSelectedAssetId}
          />
        </div>
        <AssetDetailPanel
          assetSummary={summary}
          assetDetails={assetDetails}
          isLoading={detailsLoading || isLoading}
        />
      </div>
    </div>
  );
};

export default AssetExplorerPage;
