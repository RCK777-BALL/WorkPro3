/*
 * SPDX-License-Identifier: MIT
 */

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { PmCompletionResponse } from '@backend-shared/pmAnalytics';

import { fetchPmCompletionAnalytics } from '@/api/pmAnalytics';

export const PM_COMPLETION_QUERY_KEY = 'pm-completion-analytics';

export const usePmCompletionAnalytics = (months?: number) =>
  useQuery<PmCompletionResponse>({
    queryKey: [PM_COMPLETION_QUERY_KEY, months ?? 'default'],
    queryFn: () => fetchPmCompletionAnalytics(months),
    placeholderData: keepPreviousData,
  });
