/*
 * SPDX-License-Identifier: MIT
 */

import http from '@/lib/http';
import type { TenantScoped } from '@shared/http';

export type HierarchyAsset = TenantScoped & {
  id: string;
  name: string;
  status?: string;
  type?: 'Electrical' | 'Mechanical' | 'Tooling' | 'Interface';
  criticality?: string;
  departmentId?: string;
  lineId?: string;
  stationId?: string;
};

export type HierarchyStation = TenantScoped & {
  id: string;
  name: string;
  notes?: string;
  departmentId?: string;
  lineId: string;
  assetCount: number;
  assets: HierarchyAsset[];
};

export type HierarchyLine = TenantScoped & {
  id: string;
  name: string;
  notes?: string;
  departmentId: string;
  assetCount: number;
  assets: HierarchyAsset[];
  stations: HierarchyStation[];
};

export type HierarchyDepartment = TenantScoped & {
  id: string;
  name: string;
  notes?: string;
  plantId?: string;
  assetCount: number;
  assets: HierarchyAsset[];
  lines: HierarchyLine[];
};

export type HierarchyResponse = {
  departments: HierarchyDepartment[];
};

export type AssetDetailResponse = {
  asset: {
    id: string;
    tenantId: string;
    name: string;
    description?: string;
    status?: string;
    type?: HierarchyAsset['type'];
    criticality?: string;
    location?: string;
    serialNumber?: string;
    siteId?: string;
    plantId?: string;
    lineId?: string;
    stationId?: string;
    departmentId?: string;
  };
  history: Array<{
    id: string;
    date: string;
    title: string;
    status: string;
    duration?: number;
    notes?: string;
  }>;
  documents: Array<{
    id: string;
    name?: string;
    type?: string;
    url: string;
    uploadedAt?: string;
  }>;
  parts: Array<{
    id: string;
    name: string;
    quantity: number;
    unitCost?: number;
    location?: string;
  }>;
  pmTasks: Array<{
    id: string;
    title: string;
    active: boolean;
    lastGeneratedAt?: string;
  }>;
  workOrders: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    type: string;
    updatedAt?: string;
  }>;
  cost: {
    total: number;
    maintenance: number;
    labor: number;
    parts: number;
    currency: string;
    timeframe: string;
  };
};

export const fetchHierarchy = async (): Promise<HierarchyResponse> => {
  const res = await http.get<HierarchyResponse>('/hierarchy');
  return res.data;
};

export const fetchAssetDetails = async (assetId: string): Promise<AssetDetailResponse> => {
  const res = await http.get<AssetDetailResponse>(`/hierarchy/assets/${assetId}`);
  return res.data;
};
