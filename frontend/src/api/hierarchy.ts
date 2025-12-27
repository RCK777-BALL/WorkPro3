/*
 * SPDX-License-Identifier: MIT
 */

import http from '@/lib/http';
import type { Asset } from '@/types';
import type { TenantScoped } from '@backend-shared/http';

export type HierarchyAsset = TenantScoped &
  Pick<
    Asset,
    'id' | 'tenantId' | 'name' | 'status' | 'type' | 'criticality' | 'departmentId' | 'lineId' | 'stationId'
  >;

export type HierarchyStation = TenantScoped & {
  id: string;
  name: string;
  notes?: string;
  departmentId?: string;
  lineId: string;
  assetCount: number;
  assets: HierarchyAsset[];
  siteId?: string;
};

export type HierarchyLine = TenantScoped & {
  id: string;
  name: string;
  notes?: string;
  departmentId: string;
  assetCount: number;
  assets: HierarchyAsset[];
  stations: HierarchyStation[];
  siteId?: string;
};

export type HierarchyDepartment = TenantScoped & {
  id: string;
  name: string;
  notes?: string;
  plantId?: string;
  assetCount: number;
  assets: HierarchyAsset[];
  lines: HierarchyLine[];
  siteId?: string;
};

export type HierarchyResponse = {
  departments: HierarchyDepartment[];
};

export type AssetDetailResponse = {
  asset: Pick<
    Asset,
    | 'id'
    | 'tenantId'
    | 'name'
    | 'description'
    | 'status'
    | 'type'
    | 'criticality'
    | 'location'
    | 'serialNumber'
    | 'purchaseDate'
    | 'warrantyStart'
    | 'warrantyEnd'
    | 'purchaseCost'
    | 'expectedLifeMonths'
    | 'replacementDate'
    | 'siteId'
    | 'plantId'
    | 'lineId'
    | 'stationId'
    | 'departmentId'
  >;
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
  pmTemplates: Array<{
    templateId: string;
    assignmentId: string;
    title: string;
    interval?: string;
    active: boolean;
    nextDue?: string;
    usageMetric?: string;
    usageTarget?: number;
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
