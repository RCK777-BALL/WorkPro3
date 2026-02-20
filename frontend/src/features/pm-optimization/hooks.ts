/*
 * SPDX-License-Identifier: MIT
 */

import { useQuery } from '@tanstack/react-query';

import { fetchPmWhatIfSimulations, type PmOptimizationResponse } from '@/api/pmOptimization';

export const PM_OPTIMIZATION_QUERY_KEY = ['pm', 'optimization', 'what-if'] as const;

export const usePmWhatIfSimulations = () =>
  useQuery<PmOptimizationResponse>({
    queryKey: PM_OPTIMIZATION_QUERY_KEY,
    queryFn: fetchPmWhatIfSimulations,
    staleTime: 60_000,
  });
