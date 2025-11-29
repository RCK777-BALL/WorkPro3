/*
 * SPDX-License-Identifier: MIT
 */

import type { PmCompletionResponse } from '@backend-shared/pmAnalytics';

import http from '@/lib/http';

export const fetchPmCompletionAnalytics = async (months?: number) => {
  const response = await http.get<PmCompletionResponse>('/analytics/pm/completions', {
    params: months ? { months } : undefined,
  });
  return response.data;
};
