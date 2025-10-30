/*
 * SPDX-License-Identifier: MIT
 */

import http from '@/lib/http';
import type { WorkHistory } from '@/types';

export interface WorkHistoryRecord extends WorkHistory {
  _id: string;
  memberId: string;
}

export type CreateWorkHistoryPayload = WorkHistory & { memberId: string };
export type UpdateWorkHistoryPayload = WorkHistory & { memberId: string };

export const fetchWorkHistoryByMember = async (
  memberId: string,
): Promise<WorkHistoryRecord | null> => {
  const response = await http.get<WorkHistoryRecord | null>('/work-history', {
    params: { memberId },
  });
  return response.data;
};

export const createWorkHistory = async (
  payload: CreateWorkHistoryPayload,
): Promise<WorkHistoryRecord> => {
  const response = await http.post<WorkHistoryRecord>('/work-history', payload);
  return response.data;
};

export const updateWorkHistory = async (
  id: string,
  payload: UpdateWorkHistoryPayload,
): Promise<WorkHistoryRecord> => {
  const response = await http.put<WorkHistoryRecord>(`/work-history/${id}`, payload);
  return response.data;
};

export default {
  fetchWorkHistoryByMember,
  createWorkHistory,
  updateWorkHistory,
};
