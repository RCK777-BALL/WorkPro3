/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useMemo, useState } from 'react';

import AssetDetailPanel from './AssetDetailPanel';
import HierarchyTree from './HierarchyTree';
import { useAssetDetails, useHierarchyTree, useSelectedAssetSummary } from './hooks';
import type { HierarchyAsset, HierarchyResponse } from '@/api/hierarchy';

type AssetRow = {
  asset: HierarchyAsset;
  departmentName?: string;
  lineName?: string;
  stationName?: string;
};

const statusBadgeClass = (status?: string) => {
  switch (status?.toLowerCase()) {
    case 'offline':
      return 'bg-amber-500/20 text-amber-400';
    case 'in repair':
      return 'bg-rose-500/20 text-rose-400';
    default:
      return 'bg-emerald-500/20 text-emerald-300';
  }
};

const criticalityDotClass = (criticality?: string) => {
  switch (criticality) {
    case 'high':
      return 'bg-rose-500';
    case 'low':
      return 'bg-emerald-500';
    default:
      return 'bg-amber-400';
  }
};

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

  const assetRows = useMemo(() => {
    if (!data) return [] as AssetRow[];

    const rows: AssetRow[] = [];

    data.departments.forEach((department) => {
      department.assets.forEach((asset) => rows.push({ asset, departmentName: department.name }));

      department.lines.forEach((line) => {
        line.assets.forEach((asset) => rows.push({ asset, departmentName: department.name, lineName: line.name }));

        line.stations.forEach((station) => {
          station.assets.forEach((asset) =>
            rows.push({ asset, departmentName: department.name, lineName: line.name, stationName: station.name }),
          );
        });
      });
    });

    return rows;
  }, [data]);

  const formatLocation = (row: AssetRow) =>
    [row.departmentName, row.lineName, row.stationName].filter(Boolean).join(' / ');

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

        <div className="space-y-4">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40">
            <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
              <div>
                <p className="text-xs uppercase text-neutral-500">Asset list</p>
                <p className="text-sm text-neutral-300">Select a row to sync with the hierarchy tree.</p>
              </div>
              <span className="rounded-full bg-neutral-900 px-3 py-1 text-xs text-neutral-300">
                {assetRows.length} assets
              </span>
            </div>

            <div className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-neutral-800 text-sm">
                  <thead className="bg-neutral-900/60 text-left text-xs uppercase tracking-wide text-neutral-500">
                    <tr>
                      <th className="px-4 py-3">Asset</th>
                      <th className="px-4 py-3">Location</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Criticality</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-900 bg-neutral-950/30">
                    {isLoading && (
                      <tr>
                        <td className="px-4 py-4 text-neutral-400" colSpan={4}>
                          Loading assets…
                        </td>
                      </tr>
                    )}
                    {!isLoading && assetRows.length === 0 && (
                      <tr>
                        <td className="px-4 py-4 text-neutral-400" colSpan={4}>
                          No assets found in the current hierarchy.
                        </td>
                      </tr>
                    )}
                    {assetRows.map((row) => (
                      <tr
                        key={row.asset.id}
                        onClick={() => setSelectedAssetId(row.asset.id)}
                        className={`cursor-pointer transition hover:bg-indigo-500/10 ${
                          selectedAssetId === row.asset.id ? 'bg-indigo-500/20 text-indigo-100' : 'text-neutral-200'
                        }`}
                      >
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full ${criticalityDotClass(row.asset.criticality)}`} />
                            <span className="font-semibold">{row.asset.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-neutral-300">{formatLocation(row) || 'Unassigned'}</td>
                        <td className="px-4 py-2">
                          {row.asset.status ? (
                            <span className={`rounded-full px-2 py-0.5 text-xs ${statusBadgeClass(row.asset.status)}`}>
                              {row.asset.status}
                            </span>
                          ) : (
                            <span className="text-xs text-neutral-500">Active</span>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          <span className="text-xs uppercase text-neutral-400">{row.asset.criticality ?? 'medium'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <AssetDetailPanel
            assetSummary={summary}
            assetDetails={assetDetails}
            hierarchy={data}
            isLoading={detailsLoading || isLoading}
            onSelectAsset={setSelectedAssetId}
          />
        </div>
      </div>
    </div>
  );
};

export default AssetExplorerPage;
