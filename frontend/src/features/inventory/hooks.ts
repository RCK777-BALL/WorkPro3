/*
 * SPDX-License-Identifier: MIT
 */

import { useMutation, useQuery, useQueryClient } from 'react-query';

import {
  createPurchaseOrder,
  fetchInventoryAlerts,
  fetchPartUsageReport,
  fetchParts,
  fetchVendors,
} from '@/api/inventory';
import type { PurchaseOrderPayload } from '@/types';

export const INVENTORY_PARTS_QUERY_KEY = ['inventory', 'v2', 'parts'] as const;
export const INVENTORY_VENDORS_QUERY_KEY = ['inventory', 'v2', 'vendors'] as const;
export const INVENTORY_ALERTS_QUERY_KEY = ['inventory', 'v2', 'alerts'] as const;
export const INVENTORY_USAGE_REPORT_QUERY_KEY = ['inventory', 'v2', 'analytics', 'usage'] as const;

export const usePartsQuery = () =>
  useQuery({ queryKey: INVENTORY_PARTS_QUERY_KEY, queryFn: fetchParts, staleTime: 30_000 });

export const useVendorsQuery = () =>
  useQuery({ queryKey: INVENTORY_VENDORS_QUERY_KEY, queryFn: fetchVendors, staleTime: 60_000 });

export const useAlertsQuery = () =>
  useQuery({ queryKey: INVENTORY_ALERTS_QUERY_KEY, queryFn: fetchInventoryAlerts, staleTime: 15_000 });

export const usePartUsageReport = () =>
  useQuery({ queryKey: INVENTORY_USAGE_REPORT_QUERY_KEY, queryFn: fetchPartUsageReport, staleTime: 60_000 });

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
