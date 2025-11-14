/*
 * SPDX-License-Identifier: MIT
 */

import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from 'react-query';

import { fetchPmTemplates, upsertPmAssignment, deletePmAssignment, type AssignmentPayload } from '@/api/pm';
import { fetchInventoryItems } from '@/api/inventoryItems';
import { useHierarchyTree } from '@/features/assets/hooks';
import type { InventoryItem, PMTemplate } from '@/types';

export const PM_TEMPLATES_QUERY_KEY = ['pm', 'templates'] as const;

export const usePmTemplates = () =>
  useQuery({ queryKey: PM_TEMPLATES_QUERY_KEY, queryFn: fetchPmTemplates, staleTime: 30_000 });

export const useUpsertAssignment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ templateId, payload }: { templateId: string; payload: AssignmentPayload & { assignmentId?: string } }) =>
      upsertPmAssignment(templateId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries(PM_TEMPLATES_QUERY_KEY);
    },
  });
};

export const useDeleteAssignment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ templateId, assignmentId }: { templateId: string; assignmentId: string }) =>
      deletePmAssignment(templateId, assignmentId),
    onSuccess: () => {
      void queryClient.invalidateQueries(PM_TEMPLATES_QUERY_KEY);
    },
  });
};

export const useInventoryOptions = () =>
  useQuery({
    queryKey: ['inventory', 'items'],
    queryFn: fetchInventoryItems,
    staleTime: 60_000,
  });

export const useAssetOptions = () => {
  const { data, ...rest } = useHierarchyTree();
  const assets = useMemo(() => {
    if (!data) return [] as Array<{ id: string; name: string }>;
    const list: Array<{ id: string; name: string }> = [];
    const pushAsset = (asset?: { id: string; name: string }) => {
      if (asset) list.push({ id: asset.id, name: asset.name });
    };
    for (const dept of data.departments) {
      dept.assets.forEach(pushAsset);
      for (const line of dept.lines) {
        line.assets.forEach(pushAsset);
        for (const station of line.stations) {
          station.assets.forEach(pushAsset);
        }
      }
    }
    return list;
  }, [data]);
  return { assets, hierarchyQuery: { data, ...rest } };
};

export type InventoryOption = Pick<InventoryItem, 'id' | 'name'>;

export const useInventorySelectOptions = () => {
  const query = useInventoryOptions();
  const options = useMemo(() => {
    return (query.data ?? []).map((item) => ({ id: (item as any)._id ?? item.id ?? '', name: item.name }));
  }, [query.data]);
  return { options, query };
};

export const useTemplateById = (templates?: PMTemplate[], templateId?: string) =>
  useMemo(() => templates?.find((template) => template.id === templateId), [templates, templateId]);
