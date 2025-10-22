/*
 * SPDX-License-Identifier: MIT
 */

export interface AssetNode {
  _id: string;
  name: string;
  type: 'Electrical' | 'Mechanical' | 'Tooling' | 'Interface' | string;
  status?: string;
  criticality?: string;
  notes?: string;
  location?: string;
}

export interface StationNode {
  _id: string;
  name: string;
  notes?: string;
  assets: AssetNode[];
}

export interface LineNode {
  _id: string;
  name: string;
  notes?: string;
  stations: StationNode[];
}

export interface DepartmentNode {
  _id: string;
  name: string;
  notes?: string;
  lines: LineNode[];
}

export type HierarchyEntityType = 'department' | 'line' | 'station' | 'asset';

export interface ContextTarget {
  type: HierarchyEntityType;
  departmentId?: string;
  lineId?: string;
  stationId?: string;
  assetId?: string;
  name?: string;
}
