/*
 * SPDX-License-Identifier: MIT
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { deleteVendor, fetchVendor, fetchVendors, saveVendor } from '@/api/vendors';
import type { Vendor } from '@/types/vendor';

export const VENDORS_QUERY_KEY = ['vendors'] as const;

export const useVendors = () =>
  useQuery({ queryKey: VENDORS_QUERY_KEY, queryFn: fetchVendors, staleTime: 60_000 });

export const useVendor = (id?: string) =>
  useQuery({ queryKey: [...VENDORS_QUERY_KEY, id], queryFn: () => fetchVendor(id!), enabled: Boolean(id) });

export const useSaveVendor = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Vendor> & { name: string; id?: string }) => saveVendor(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries(VENDORS_QUERY_KEY);
    },
  });
};

export const useDeleteVendor = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vendorId: string) => deleteVendor(vendorId),
    onSuccess: () => {
      void queryClient.invalidateQueries(VENDORS_QUERY_KEY);
    },
  });
};
