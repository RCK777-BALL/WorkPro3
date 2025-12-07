/*
 * SPDX-License-Identifier: MIT
 */

import { useMutation, useQuery, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';

import { dismissOnboardingReminder, fetchOnboardingState } from '@/api/onboarding';
import { cloneTemplateIntoTenant, fetchInspectionForms, fetchTemplateLibrary } from '@/api/templates';
import { PM_TEMPLATES_QUERY_KEY } from '@/features/pm/hooks';
import type { OnboardingStepKey, PMTemplateLibraryItem } from '@/types';

export const ONBOARDING_QUERY_KEY = ['onboarding', 'state'] as const;
export const PM_TEMPLATE_LIBRARY_QUERY_KEY = ['templates', 'library'] as const;
export const INSPECTION_LIBRARY_QUERY_KEY = ['templates', 'inspections'] as const;

export const useOnboardingState = () =>
  useQuery({ queryKey: ONBOARDING_QUERY_KEY, queryFn: fetchOnboardingState, staleTime: 30_000 });

export const usePmTemplateLibrary = () =>
  useQuery({ queryKey: PM_TEMPLATE_LIBRARY_QUERY_KEY, queryFn: fetchTemplateLibrary, staleTime: 60_000 });

export const useInspectionFormLibrary = () =>
  useQuery({ queryKey: INSPECTION_LIBRARY_QUERY_KEY, queryFn: fetchInspectionForms, staleTime: 60_000 });

export const useClonePmTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (templateId: string) => cloneTemplateIntoTenant(templateId),
    onSuccess: () => {
      void queryClient.invalidateQueries(PM_TEMPLATES_QUERY_KEY);
      void queryClient.invalidateQueries(ONBOARDING_QUERY_KEY);
    },
  });
};

export const useDismissOnboardingReminder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: dismissOnboardingReminder,
    onSuccess: () => {
      void queryClient.invalidateQueries(ONBOARDING_QUERY_KEY);
      toast.success('Reminder snoozed for 12 hours.');
    },
  });
};

export const useStepActionLabel = (key: OnboardingStepKey): string => {
  const labels: Record<OnboardingStepKey, string> = {
    site: 'Go to sites',
    roles: 'Configure roles',
    departments: 'Build departments',
    assets: 'Start import',
    starterData: 'Load starter data',
    pmTemplates: 'Open PM templates',
    users: 'Invite teammates',
  };
  return labels[key];
};

export const getTemplatePreview = (template: PMTemplateLibraryItem) => {
  const preview = template.checklist.slice(0, 3).join(', ');
  const hasMore = template.checklist.length > 3;
  return hasMore ? `${preview}, …` : preview;
};
