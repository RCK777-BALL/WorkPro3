/*
 * SPDX-License-Identifier: MIT
 */

import http from '@/lib/http';
import type { WorkHistory } from '@/types';

export const fetchWorkHistoryByMember = async (memberId: string): Promise<WorkHistory | null> => {
  const response = await http.get<WorkHistory | null>('/work-history', {
    params: { memberId },
  });
  return response.data;
};
