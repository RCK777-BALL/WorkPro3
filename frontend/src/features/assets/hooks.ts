/*
 * SPDX-License-Identifier: MIT
 */

import { useMemo } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';

import { fetchAssetDetails, fetchHierarchy, type HierarchyAsset, type HierarchyResponse } from '@/api/hierarchy';
import { createMeterReading, fetchMeters, type CreateMeterReadingInput, type MeterReading } from '@/api/meters';

export const HIERARCHY_QUERY_KEY = ['hierarchy', 'tree'] as const;

export const useHierarchyTree = () =>
  useQuery({ queryKey: HIERARCHY_QUERY_KEY, queryFn: fetchHierarchy, staleTime: 60_000 });

export const useAssetDetails = (assetId?: string) =>
  useQuery({
    queryKey: ['hierarchy', 'asset', assetId],
    queryFn: () => fetchAssetDetails(assetId!),
    enabled: Boolean(assetId),
    staleTime: 30_000,
  });

export type MeterType = 'runtimeHours' | 'cycles';

export const useCreateMeterReading = () =>
  useMutation<MeterReading, Error, CreateMeterReadingInput>({
    mutationFn: createMeterReading,
  });

export const useAssetMeters = (assetId?: string) =>
  useQuery({
    queryKey: ['hierarchy', 'asset', assetId, 'meters'],
    queryFn: () => fetchMeters(assetId),
    enabled: Boolean(assetId),
    staleTime: 30_000,
  });

export type TreeAssetSummary = {
  asset: HierarchyAsset;
  departmentName?: string;
  lineName?: string;
  stationName?: string;
};

export const useSelectedAssetSummary = (
  assetId?: string,
  hierarchy?: HierarchyResponse,
): TreeAssetSummary | undefined =>
  useMemo(() => {
    if (!assetId || !hierarchy) {
      return undefined;
    }
    for (const department of hierarchy.departments) {
      for (const deptAsset of department.assets) {
        if (deptAsset.id === assetId) {
          return { asset: deptAsset, departmentName: department.name };
        }
      }
      for (const line of department.lines) {
        for (const lineAsset of line.assets) {
          if (lineAsset.id === assetId) {
            return {
              asset: lineAsset,
              departmentName: department.name,
              lineName: line.name,
            };
          }
        }
        for (const station of line.stations) {
          for (const stationAsset of station.assets) {
            if (stationAsset.id === assetId) {
              return {
                asset: stationAsset,
                departmentName: department.name,
                lineName: line.name,
                stationName: station.name,
              };
            }
          }
        }
      }
    }
    return undefined;
  }, [assetId, hierarchy]);

