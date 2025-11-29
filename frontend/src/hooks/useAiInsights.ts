/*
 * SPDX-License-Identifier: MIT
 */

import { useQuery } from 'react-query';

import { fetchFailurePrediction, fetchWorkOrderCopilot, type FailurePredictionParams } from '@/api/ai';

export const aiQueryKeys = {
  failurePrediction: (params: FailurePredictionParams) => [
    'ai',
    'failure-prediction',
    params.workOrderId ?? 'none',
    params.assetId ?? 'none',
  ],
  workOrderCopilot: (workOrderId?: string) => ['ai', 'copilot', workOrderId ?? ''],
};

export const useFailurePrediction = (params: FailurePredictionParams) =>
  useQuery({
    queryKey: aiQueryKeys.failurePrediction(params),
    queryFn: () => fetchFailurePrediction(params),
    enabled: Boolean(params.workOrderId || params.assetId),
    staleTime: 30_000,
  });

export const useWorkOrderCopilot = (workOrderId?: string) =>
  useQuery({
    queryKey: aiQueryKeys.workOrderCopilot(workOrderId),
    queryFn: () => fetchWorkOrderCopilot(workOrderId ?? ''),
    enabled: Boolean(workOrderId),
    staleTime: 30_000,
  });

