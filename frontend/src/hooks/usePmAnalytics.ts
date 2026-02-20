/*
 * SPDX-License-Identifier: MIT
 */

import { useQuery } from '@tanstack/react-query';
import type { PmCompletionResponse } from '@backend-shared/pmAnalytics';

import { fetchPmCompletionAnalytics } from '@/api/pmAnalytics';

export const PM_COMPLETION_QUERY_KEY = 'pm-completion-analytics';

export const usePmCompletionAnalytics = (months?: number) =>
  useQuery<PmCompletionResponse>([PM_COMPLETION_QUERY_KEY, months ?? 'default'], () => fetchPmCompletionAnalytics(months), {
    keepPreviousData: true,
  });
