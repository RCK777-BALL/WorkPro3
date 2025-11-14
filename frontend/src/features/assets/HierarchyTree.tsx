/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useMemo, useState } from 'react';

import type { HierarchyAsset, HierarchyDepartment, HierarchyLine, HierarchyResponse, HierarchyStation } from '@/api/hierarchy';

const matchText = (value: string, term: string) => value.toLowerCase().includes(term.toLowerCase());

const filterAssets = (assets: HierarchyAsset[], term: string) =>
  assets.filter((asset) => matchText(asset.name, term));

const filterStations = (stations: HierarchyStation[], term: string): HierarchyStation[] =>
  stations
    .map((station) => {
      const assets = filterAssets(station.assets, term);
      const stationMatches = matchText(station.name, term);
      if (!stationMatches && assets.length === 0) {
        return null;
      }
      return { ...station, assets };
    })
    .filter((value): value is HierarchyStation => Boolean(value));

const filterLines = (lines: HierarchyLine[], term: string): HierarchyLine[] =>
  lines
    .map((line) => {
      const assets = filterAssets(line.assets, term);
      const stations = filterStations(line.stations, term);
      const matches = matchText(line.name, term) || stations.length > 0 || assets.length > 0;
      if (!matches) {
        return null;
      }
      return { ...line, assets, stations };
    })
    .filter((value): value is HierarchyLine => Boolean(value));

const filterDepartments = (departments: HierarchyDepartment[], term: string): HierarchyDepartment[] =>
  departments
    .map((department) => {
      const assets = filterAssets(department.assets, term);
      const lines = filterLines(department.lines, term);
      const matches = matchText(department.name, term) || assets.length > 0 || lines.length > 0;
      if (!matches) {
        return null;
      }
      return { ...department, assets, lines };
    })
    .filter((value): value is HierarchyDepartment => Boolean(value));

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

type HierarchyTreeProps = {
  data?: HierarchyResponse;
  isLoading?: boolean;
  selectedAssetId?: string;
  onSelect(assetId: string): void;
};

const HierarchyTree = ({ data, isLoading, selectedAssetId, onSelect }: HierarchyTreeProps) => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!data) return;
    const initialExpanded: Record<string, boolean> = {};
    data.departments.forEach((department) => {
      initialExpanded[department.id] = true;
      department.lines.forEach((line) => {
        initialExpanded[line.id] = true;
        line.stations.forEach((station) => {
          initialExpanded[station.id] = false;
        });
      });
    });
    setExpanded(initialExpanded);
  }, [data]);

  const filteredDepartments = useMemo(() => {
    if (!data) {
      return [] as HierarchyDepartment[];
    }
    if (!search.trim()) {
      return data.departments;
    }
    return filterDepartments(data.departments, search.trim().toLowerCase());
  }, [data, search]);

  const toggle = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (isLoading) {
    return (
      <div className="p-4 text-sm text-neutral-400">Loading hierarchy…</div>
    );
  }

  if (!data || filteredDepartments.length === 0) {
    return (
      <div className="p-4 space-y-3">
        <input
          className="w-full rounded-md border border-neutral-700 bg-neutral-900/40 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
          placeholder="Search assets"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <p className="text-sm text-neutral-400">No hierarchy data available.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="p-4">
        <input
          className="w-full rounded-md border border-neutral-700 bg-neutral-900/40 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
          placeholder="Search assets"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {filteredDepartments.map((department) => (
          <div key={department.id} className="mb-3 rounded-lg border border-neutral-800 bg-neutral-900/60">
            <button
              type="button"
              onClick={() => toggle(department.id)}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-semibold text-neutral-100"
            >
              <span>{department.name}</span>
              <span className="text-xs text-neutral-400">{department.assetCount} assets</span>
            </button>
            {expanded[department.id] && (
              <div className="space-y-2 border-t border-neutral-800 p-3">
                {department.lines.map((line) => (
                  <div key={line.id} className="rounded-lg bg-neutral-900/80">
                    <button
                      type="button"
                      onClick={() => toggle(line.id)}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-neutral-200"
                    >
                      <div className="flex items-center space-x-2">
                        <span className="text-xs uppercase text-neutral-500">Line</span>
                        <span>{line.name}</span>
                      </div>
                      <span className="text-xs text-neutral-500">{line.assetCount} assets</span>
                    </button>
                    {expanded[line.id] && (
                      <div className="space-y-2 border-t border-neutral-800 px-3 py-2">
                        {line.stations.map((station) => (
                          <div key={station.id} className="rounded-md bg-neutral-900/70">
                            <button
                              type="button"
                              onClick={() => toggle(station.id)}
                              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-neutral-200"
                            >
                              <div className="flex items-center space-x-2">
                                <span className="text-xs uppercase text-neutral-500">Station</span>
                                <span>{station.name}</span>
                              </div>
                              <span className="text-xs text-neutral-500">{station.assetCount} assets</span>
                            </button>
                            {expanded[station.id] && (
                              <div className="space-y-1 border-t border-neutral-800 px-3 py-2">
                                {station.assets.map((asset) => (
                                  <button
                                    key={asset.id}
                                    type="button"
                                    onClick={() => onSelect(asset.id)}
                                    className={`flex w-full items-center justify-between rounded-md px-2 py-1 text-left text-sm transition hover:bg-indigo-500/10 ${
                                      selectedAssetId === asset.id
                                        ? 'bg-indigo-500/20 text-indigo-200'
                                        : 'text-neutral-200'
                                    }`}
                                  >
                                    <span className="flex items-center space-x-2">
                                      <span className={`h-2 w-2 rounded-full ${criticalityDotClass(asset.criticality)}`} />
                                      <span>{asset.name}</span>
                                    </span>
                                    {asset.status && (
                                      <span className={`rounded-full px-2 py-0.5 text-xs ${statusBadgeClass(asset.status)}`}>
                                        {asset.status}
                                      </span>
                                    )}
                                  </button>
                                ))}
                                {station.assets.length === 0 && (
                                  <p className="text-xs text-neutral-500">No assets at this station</p>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                        {line.assets.length > 0 && (
                          <div className="space-y-1 rounded-md border border-neutral-800 px-2 py-2">
                            {line.assets.map((asset) => (
                              <button
                                key={asset.id}
                                type="button"
                                onClick={() => onSelect(asset.id)}
                                className={`flex w-full items-center justify-between rounded-md px-2 py-1 text-left text-sm transition hover:bg-indigo-500/10 ${
                                  selectedAssetId === asset.id ? 'bg-indigo-500/20 text-indigo-100' : 'text-neutral-200'
                                }`}
                              >
                                <span className="flex items-center space-x-2">
                                  <span className={`h-2 w-2 rounded-full ${criticalityDotClass(asset.criticality)}`} />
                                  <span>{asset.name}</span>
                                </span>
                                {asset.status && (
                                  <span className={`rounded-full px-2 py-0.5 text-xs ${statusBadgeClass(asset.status)}`}>
                                    {asset.status}
                                  </span>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {department.assets.length > 0 && (
                  <div className="space-y-1 rounded-md border border-dashed border-neutral-800 px-2 py-2">
                    {department.assets.map((asset) => (
                      <button
                        key={asset.id}
                        type="button"
                        onClick={() => onSelect(asset.id)}
                        className={`flex w-full items-center justify-between rounded-md px-2 py-1 text-left text-sm transition hover:bg-indigo-500/10 ${
                          selectedAssetId === asset.id ? 'bg-indigo-500/20 text-indigo-100' : 'text-neutral-200'
                        }`}
                      >
                        <span className="flex items-center space-x-2">
                          <span className={`h-2 w-2 rounded-full ${criticalityDotClass(asset.criticality)}`} />
                          <span>{asset.name}</span>
                        </span>
                        {asset.status && (
                          <span className={`rounded-full px-2 py-0.5 text-xs ${statusBadgeClass(asset.status)}`}>
                            {asset.status}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default HierarchyTree;
