/*
 * SPDX-License-Identifier: MIT
 */

import { useMutation, useQuery, useQueryClient } from 'react-query';

import {
  createPurchaseOrder,
  fetchPurchaseOrder,
  listPurchaseOrders,
  updatePurchaseOrder,
  updatePurchaseOrderStatus,
  type PurchaseOrder,
  type PurchaseOrderInput,
  type PurchaseOrderStatus,
} from '@/api/purchasing';

export const PURCHASE_ORDERS_QUERY_KEY = ['purchasing', 'orders'] as const;

export const usePurchaseOrders = () =>
  useQuery({ queryKey: PURCHASE_ORDERS_QUERY_KEY, queryFn: listPurchaseOrders, staleTime: 15_000 });

export const usePurchaseOrder = (id?: string) =>
  useQuery({
    enabled: Boolean(id),
    queryKey: [...PURCHASE_ORDERS_QUERY_KEY, id],
    queryFn: () => fetchPurchaseOrder(id ?? ''),
    staleTime: 10_000,
  });

export const useCreatePurchaseOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: PurchaseOrderInput) => createPurchaseOrder(payload),
    onSuccess: (po) => {
      void queryClient.invalidateQueries(PURCHASE_ORDERS_QUERY_KEY);
      queryClient.setQueryData<PurchaseOrder[]>(PURCHASE_ORDERS_QUERY_KEY, (current = []) => [po, ...current]);
    },
  });
};

export const useUpdatePurchaseOrder = (id?: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: PurchaseOrderInput) => updatePurchaseOrder(id ?? '', payload),
    onSuccess: (po) => {
      void queryClient.invalidateQueries(PURCHASE_ORDERS_QUERY_KEY);
      if (id) {
        void queryClient.invalidateQueries([...PURCHASE_ORDERS_QUERY_KEY, id]);
      }
      queryClient.setQueryData<PurchaseOrder[]>(PURCHASE_ORDERS_QUERY_KEY, (current = []) =>
        current.map((item) => (item.id === po.id ? po : item)),
      );
    },
  });
};

export const useAdvancePurchaseOrder = (id?: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { status?: PurchaseOrderStatus; receipts?: Array<{ part: string; quantity: number }> }) =>
      updatePurchaseOrderStatus(id ?? '', payload),
    onSuccess: (po) => {
      void queryClient.invalidateQueries(PURCHASE_ORDERS_QUERY_KEY);
      if (id) {
        void queryClient.invalidateQueries([...PURCHASE_ORDERS_QUERY_KEY, id]);
      }
      queryClient.setQueryData<PurchaseOrder[]>(PURCHASE_ORDERS_QUERY_KEY, (current = []) =>
        current.map((item) => (item.id === po.id ? po : item)),
      );
    },
  });
};
