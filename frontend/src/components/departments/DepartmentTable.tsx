/*
 * SPDX-License-Identifier: MIT
 */

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Layers, Plus, Trash2 } from 'lucide-react';
import Button from '@/components/common/Button';
import Badge from '@/components/common/Badge';
import type { Asset, DepartmentHierarchy, LineWithStations, StationWithAssets } from '@/types';

type AssetCategory = Asset['type'] | 'All';

interface DepartmentTableProps {
  departments: DepartmentHierarchy[];
  categoryFilter: AssetCategory;
  onEditDepartment: (department: DepartmentHierarchy) => void;
  onAddLine: (department: DepartmentHierarchy) => void;
  onEditLine: (department: DepartmentHierarchy, line: LineWithStations) => void;
  onDeleteLine: (department: DepartmentHierarchy, line: LineWithStations) => void;
  onAddStation: (department: DepartmentHierarchy, line: LineWithStations) => void;
  onEditStation: (
    department: DepartmentHierarchy,
    line: LineWithStations,
    station: StationWithAssets,
  ) => void;
  onDeleteStation: (
    department: DepartmentHierarchy,
    line: LineWithStations,
    station: StationWithAssets,
  ) => void;
  onAddAsset: (
    department: DepartmentHierarchy,
    line: LineWithStations,
    station: StationWithAssets,
  ) => void;
  onEditAsset: (
    department: DepartmentHierarchy,
    line: LineWithStations,
    station: StationWithAssets,
    asset: Asset,
  ) => void;
  onDeleteAsset: (
    department: DepartmentHierarchy,
    line: LineWithStations,
    station: StationWithAssets,
    asset: Asset,
  ) => void;
}

const typeBadges: Record<Asset['type'], string> = {
  Electrical: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200',
  Mechanical: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
  Tooling: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
  Interface: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-200',
};

const DepartmentTable = ({
  departments,
  categoryFilter,
  onEditDepartment,
  onAddLine,
  onEditLine,
  onDeleteLine,
  onAddStation,
  onEditStation,
  onDeleteStation,
  onAddAsset,
  onEditAsset,
  onDeleteAsset,
}: DepartmentTableProps) => {
  const [expandedDepartments, setExpandedDepartments] = useState<Record<string, boolean>>({});
  const [expandedLines, setExpandedLines] = useState<Record<string, boolean>>({});
  const [expandedStations, setExpandedStations] = useState<Record<string, boolean>>({});

  const toggleDepartment = (id: string) =>
    setExpandedDepartments((prev) => ({ ...prev, [id]: !prev[id] }));
  const toggleLine = (id: string) =>
    setExpandedLines((prev) => ({ ...prev, [id]: !prev[id] }));
  const toggleStation = (id: string) =>
    setExpandedStations((prev) => ({ ...prev, [id]: !prev[id] }));

  const normalizedDepartments = useMemo(() => {
    if (categoryFilter === 'All') {
      return departments;
    }
    return departments.map((department) => ({
      ...department,
      lines: department.lines.map((line) => ({
        ...line,
        stations: line.stations.map((station) => ({
          ...station,
          assets: station.assets.filter((asset) => asset.type === categoryFilter),
        })),
      })),
    }));
  }, [departments, categoryFilter]);

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
      {normalizedDepartments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center text-neutral-500 dark:text-neutral-400">
          <Layers className="h-10 w-10" />
          <p className="mt-3 text-sm">No departments match your filters.</p>
        </div>
      ) : (
        <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
          {normalizedDepartments.map((department) => {
            const expanded = expandedDepartments[department.id];
            return (
              <div key={department.id} className="p-4 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <button
                    type="button"
                    onClick={() => toggleDepartment(department.id)}
                    className="flex items-start text-left"
                  >
                    <span className="mt-1 mr-3 rounded-full bg-primary-100 p-1.5 text-primary-700 dark:bg-primary-900/50 dark:text-primary-200">
                      {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </span>
                    <span>
                      <span className="block text-base font-semibold text-neutral-900 dark:text-neutral-50">
                        {department.name}
                      </span>
                      {department.description && (
                        <span className="mt-1 block text-sm text-neutral-500 dark:text-neutral-400">
                          {department.description}
                        </span>
                      )}
                    </span>
                  </button>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => onAddLine(department)}>
                      <Plus className="mr-2 h-4 w-4" />Line
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => onEditDepartment(department)}>
                      Edit
                    </Button>
                  </div>
                </div>
                {expanded && (
                  <div className="mt-4 space-y-4 sm:ml-9">
                    {department.lines.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-neutral-200 p-4 text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
                        No lines added yet.
                      </p>
                    ) : (
                      department.lines.map((line) => {
                        const lineKey = `${department.id}-${line.id}`;
                        const lineExpanded = expandedLines[lineKey];
                        return (
                          <div key={line.id} className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800/60">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <button
                                type="button"
                                onClick={() => toggleLine(lineKey)}
                                className="flex items-start text-left"
                              >
                                <span className="mt-1 mr-3 rounded-full bg-neutral-200 p-1 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200">
                                  {lineExpanded ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </span>
                                <span>
                                  <span className="block font-medium text-neutral-900 dark:text-neutral-50">
                                    {line.name}
                                  </span>
                                  {line.description && (
                                    <span className="mt-1 block text-sm text-neutral-500 dark:text-neutral-400">
                                      {line.description}
                                    </span>
                                  )}
                                </span>
                              </button>
                              <div className="flex items-center gap-2">
                                <Button variant="ghost" size="sm" onClick={() => onAddStation(department, line)}>
                                  <Plus className="mr-2 h-4 w-4" />Station
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onEditLine(department, line)}
                                >
                                  Edit
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onDeleteLine(department, line)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />Remove
                                </Button>
                              </div>
                            </div>
                            {lineExpanded && (
                              <div className="mt-4 space-y-3 sm:ml-9">
                                {line.stations.length === 0 ? (
                                  <p className="rounded-lg border border-dashed border-neutral-200 p-4 text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
                                    No stations available.
                                  </p>
                                ) : (
                                  line.stations.map((station) => {
                                    const stationKey = `${lineKey}-${station.id}`;
                                    const stationExpanded = expandedStations[stationKey];
                                    return (
                                      <div key={station.id} className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                          <button
                                            type="button"
                                            onClick={() => toggleStation(stationKey)}
                                            className="flex items-start text-left"
                                          >
                                            <span className="mt-1 mr-3 rounded-full bg-neutral-100 p-1 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                                              {stationExpanded ? (
                                                <ChevronDown className="h-4 w-4" />
                                              ) : (
                                                <ChevronRight className="h-4 w-4" />
                                              )}
                                            </span>
                                            <span>
                                              <span className="block font-medium text-neutral-900 dark:text-neutral-50">
                                                {station.name}
                                              </span>
                                              {station.description && (
                                                <span className="mt-1 block text-sm text-neutral-500 dark:text-neutral-400">
                                                  {station.description}
                                                </span>
                                              )}
                                            </span>
                                          </button>
                                          <div className="flex items-center gap-2">
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => onAddAsset(department, line, station)}
                                            >
                                              <Plus className="mr-2 h-4 w-4" />Asset
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => onEditStation(department, line, station)}
                                            >
                                              Edit
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => onDeleteStation(department, line, station)}
                                            >
                                              <Trash2 className="mr-2 h-4 w-4" />Remove
                                            </Button>
                                          </div>
                                        </div>
                                        {stationExpanded && (
                                          <div className="mt-4 space-y-3 sm:ml-9">
                                            {station.assets.length === 0 ? (
                                              <p className="rounded-lg border border-dashed border-neutral-200 p-4 text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
                                                No assets in this station.
                                              </p>
                                            ) : (
                                              station.assets.map((asset) => (
                                                <div
                                                  key={asset.id}
                                                  className="flex flex-col gap-4 rounded-lg border border-neutral-200 bg-neutral-50 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-neutral-700 dark:bg-neutral-800/50"
                                                >
                                                  <div>
                                                    <div className="flex flex-wrap items-center gap-3">
                                                      <span className="font-medium text-neutral-900 dark:text-neutral-50">
                                                        {asset.name}
                                                      </span>
                                                      <Badge
                                                        text={asset.type}
                                                        className={typeBadges[asset.type]}
                                                      />
                                                      {asset.status && (
                                                        <Badge text={asset.status} type="status" />
                                                      )}
                                                    </div>
                                                    {(asset.description || asset.location) && (
                                                      <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
                                                        {asset.description}
                                                        {asset.description && asset.location && ' · '}
                                                        {asset.location}
                                                      </p>
                                                    )}
                                                    {asset.lastServiced && (
                                                      <p className="mt-1 text-xs text-neutral-400">
                                                        Last serviced on {asset.lastServiced}
                                                      </p>
                                                    )}
                                                  </div>
                                                  <div className="flex items-center gap-2">
                                                    <Button
                                                      variant="ghost"
                                                      size="sm"
                                                      onClick={() => onEditAsset(department, line, station, asset)}
                                                    >
                                                      Edit
                                                    </Button>
                                                    <Button
                                                      variant="ghost"
                                                      size="sm"
                                                      onClick={() => onDeleteAsset(department, line, station, asset)}
                                                    >
                                                      <Trash2 className="mr-2 h-4 w-4" />Remove
                                                    </Button>
                                                  </div>
                                                </div>
                                              ))
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DepartmentTable;
