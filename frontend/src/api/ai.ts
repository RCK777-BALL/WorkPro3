/*
 * SPDX-License-Identifier: MIT
 */

import http from '@/lib/http';
import type { FailurePredictionInsight } from '@/types/ai';

export interface FailurePredictionParams {
  workOrderId?: string;
  assetId?: string;
}

export const fetchFailurePrediction = async (
  params: FailurePredictionParams,
): Promise<FailurePredictionInsight> => {
  const response = await http.get<FailurePredictionInsight>('/ai/failure-prediction', {
    params,
  });
  return response.data;
};

export const fetchWorkOrderCopilot = async (
  workOrderId: string,
): Promise<FailurePredictionInsight> => {
  const response = await http.post<FailurePredictionInsight>(`/ai/work-orders/${workOrderId}/copilot`);
  return response.data;
};

