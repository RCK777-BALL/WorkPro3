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

export const createWorkHistory = async (
  payload: WorkHistory & { memberId: string },
): Promise<WorkHistory> => {
  const response = await http.post<WorkHistory>('/work-history', payload);
  return response.data;
};

export const updateWorkHistory = async (
  workHistoryId: string,
  payload: WorkHistory & { memberId: string },
): Promise<WorkHistory> => {
  const response = await http.put<WorkHistory>(`/work-history/${workHistoryId}`, payload);
  return response.data;
};
