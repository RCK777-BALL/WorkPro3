/*
 * SPDX-License-Identifier: MIT
 */

import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from 'react-query';

import {
  createPurchaseOrder,
  fetchInventoryAlerts,
  fetchLocations,
  fetchParts,
  fetchStockHistory,
  fetchStockItems,
  fetchVendors,
  transferInventory,
} from '@/api/inventory';
import type { InventoryTransferPayload, PurchaseOrderPayload } from '@/types';

export const INVENTORY_PARTS_QUERY_KEY = ['inventory', 'v2', 'parts'] as const;
export const INVENTORY_VENDORS_QUERY_KEY = ['inventory', 'v2', 'vendors'] as const;
export const INVENTORY_ALERTS_QUERY_KEY = ['inventory', 'v2', 'alerts'] as const;
export const INVENTORY_LOCATIONS_QUERY_KEY = ['inventory', 'v2', 'locations'] as const;
export const INVENTORY_STOCK_QUERY_KEY = ['inventory', 'v2', 'stock'] as const;
export const INVENTORY_HISTORY_QUERY_KEY = ['inventory', 'v2', 'history'] as const;

export const usePartsQuery = () =>
  useQuery({ queryKey: INVENTORY_PARTS_QUERY_KEY, queryFn: fetchParts, staleTime: 30_000 });

export const useVendorsQuery = () =>
  useQuery({ queryKey: INVENTORY_VENDORS_QUERY_KEY, queryFn: fetchVendors, staleTime: 60_000 });

export const useAlertsQuery = () =>
  useQuery({ queryKey: INVENTORY_ALERTS_QUERY_KEY, queryFn: fetchInventoryAlerts, staleTime: 15_000 });

export const useLowStockParts = () => {
  const query = usePartsQuery();
  const lowStock = useMemo(
    () => (query.data ?? []).filter((part) => part.alertState?.needsReorder),
    [query.data],
  );
  return { ...query, lowStock };
};

export const useCreatePurchaseOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: PurchaseOrderPayload) => createPurchaseOrder(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries(INVENTORY_ALERTS_QUERY_KEY);
      void queryClient.invalidateQueries(INVENTORY_PARTS_QUERY_KEY);
    },
  });
};

export const useTransferInventory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: InventoryTransferPayload) => transferInventory(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries(INVENTORY_STOCK_QUERY_KEY);
      void queryClient.invalidateQueries(INVENTORY_HISTORY_QUERY_KEY);
      void queryClient.invalidateQueries(INVENTORY_PARTS_QUERY_KEY);
    },
  });
};
