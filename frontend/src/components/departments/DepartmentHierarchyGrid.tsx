/*
 * SPDX-License-Identifier: MIT
 */

import React, { useState } from 'react';
import Button from '@common/Button';
import type { DepartmentHierarchy, LineWithStations, StationWithAssets, Asset } from '@/types';

interface Props {
  department: DepartmentHierarchy;
  onCreateLine: (departmentId: string) => void;
  onUpdateLine: (line: LineWithStations) => void;
  onDeleteLine: (lineId: string) => void;
  onCreateStation: (lineId: string) => void;
  onUpdateStation: (station: StationWithAssets) => void;
  onDeleteStation: (stationId: string) => void;
  onCreateAsset: (depId: string, lineId: string, stationId: string) => void;
  onUpdateAsset: (asset: Asset, depId: string, lineId: string, stationId: string) => void;
  onDeleteAsset: (
    depId: string,
    lineId: string,
    stationId: string,
    assetId: string
  ) => void;
}

const assetTypes: Asset['type'][] = ['Electrical', 'Mechanical', 'Tooling', 'Interface'];

const DepartmentHierarchyGrid: React.FC<Props> = ({
  department,
  onCreateLine,
  onUpdateLine,
  onDeleteLine,
  onCreateStation,
  onUpdateStation,
  onDeleteStation,
  onCreateAsset,
  onUpdateAsset,
  onDeleteAsset,
}) => {
  const [expandedLines, setExpandedLines] = useState<Record<string, boolean>>({});
  const [expandedStations, setExpandedStations] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const toggleLine = (id: string) =>
    setExpandedLines((s) => ({ ...s, [id]: !s[id] }));
  const toggleStation = (id: string) =>
    setExpandedStations((s) => ({ ...s, [id]: !s[id] }));

  const filterAssets = (assets: Asset[]) =>
    assets.filter(
      (a) =>
        (!search || a.name.toLowerCase().includes(search.toLowerCase())) &&
        (!typeFilter || a.type === typeFilter)
    );

  const handleStationNameChange = (
    station: StationWithAssets,
    name: string
  ) => {
    onUpdateStation({ ...station, name });
  };

  const handleAssetChange = (
    asset: Asset,
    updates: Partial<Asset>,
    lineId: string,
    stationId: string
  ) => {
    onUpdateAsset({ ...asset, ...updates }, department.id, lineId, stationId);
  };

  return (
    <div className="space-y-4" data-testid="hierarchy-grid">
      <div className="flex space-x-2">
        <input
          type="text"
          placeholder="Search assets..."
          value={search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
          className="flex-1 px-2 py-1 border rounded-md"
        />
        <select
          value={typeFilter}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setTypeFilter(e.target.value)}
          className="px-2 py-1 border rounded-md"
        >
          <option value="">All Types</option>
          {assetTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        {department.lines.map((line) => (
          <div key={line.id} className="border rounded-md">
            <div
              className="flex justify-between items-center p-2 bg-[var(--wp-color-surface)] cursor-pointer"
              onClick={() => toggleLine(line.id)}
            >
              <input
                className="flex-1 mr-2 px-2 py-1 border rounded-md text-sm"
                value={line.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => onUpdateLine({ ...line, name: e.target.value })}
              />
              <div className="space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.stopPropagation();
                    onCreateStation(line.id);
                  }}
                >
                  Add Station
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.stopPropagation();
                    onDeleteLine(line.id);
                  }}
                >
                  Delete
                </Button>
              </div>
            </div>
            {expandedLines[line.id] && (
              <div className="p-2 space-y-2">
                {line.stations.map((station) => (
                  <div key={station.id} className="border rounded-md">
                    <div
                      className="flex justify-between items-center p-2 bg-[var(--wp-color-surface-elevated)] cursor-pointer"
                      onClick={() => toggleStation(station.id)}
                    >
                      <input
                        className="flex-1 mr-2 px-2 py-1 border rounded-md text-sm"
                        value={station.name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          handleStationNameChange(station, e.target.value)
                        }
                      />
                      <div className="space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                            e.stopPropagation();
                            onCreateAsset(department.id, line.id, station.id);
                          }}
                        >
                          Add Asset
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                            e.stopPropagation();
                            onDeleteStation(station.id);
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                    {expandedStations[station.id] && (
                      <div className="p-2 space-y-2">
                        {assetTypes.map((type) => {
                          const assets = filterAssets(
                            station.assets.filter((a) => a.type === type)
                          );
                          if (assets.length === 0) return null;
                          return (
                            <div key={type} className="ml-4">
                              <p className="font-medium text-sm mb-1">{type}</p>
                              {assets.map((asset) => (
                                <div
                                  key={asset.id}
                                  className="flex items-center space-x-2 mb-1 ml-2"
                                >
                                  <input
                                    value={asset.name}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                      handleAssetChange(
                                        asset,
                                        { name: e.target.value },
                                        line.id,
                                        station.id
                                      )
                                    }
                                    className="flex-1 px-2 py-1 border rounded-md text-sm"
                                  />
                                  <select
                                    value={asset.type}
                                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                                      handleAssetChange(
                                        asset,
                                        {
                                          type: e.target.value as Asset['type'],
                                        },
                                        line.id,
                                        station.id
                                      )
                                    }
                                    className="px-2 py-1 border rounded-md text-sm"
                                  >
                                    {assetTypes.map((t) => (
                                      <option key={t} value={t}>
                                        {t}
                                      </option>
                                    ))}
                                  </select>
                                  <Button
                                    variant="danger"
                                    size="sm"
                                    onClick={() =>
                                      onDeleteAsset(
                                        department.id,
                                        line.id,
                                        station.id,
                                        asset.id
                                      )
                                    }
                                  >
                                    Delete
                                  </Button>
                                </div>
                              ))}
                            </div>
                          );
                        })}
                        {station.assets.length === 0 && (
                          <p className="text-[var(--wp-color-text-muted)] text-sm ml-4">Add First Asset</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {line.stations.length === 0 && (
                  <p className="text-[var(--wp-color-text-muted)] text-sm ml-2">Add First Station</p>
                )}
              </div>
            )}
          </div>
        ))}
        {department.lines.length === 0 && (
          <p className="text-[var(--wp-color-text-muted)] text-sm">Add First Line</p>
        )}
      </div>

      <Button variant="outline" size="sm" onClick={() => onCreateLine(department.id)}>
        Add Line
      </Button>
    </div>
  );
};

export default DepartmentHierarchyGrid;

