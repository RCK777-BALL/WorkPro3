/*
 * SPDX-License-Identifier: MIT
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  fetchExecutiveTrends,
  fetchExecutiveSchedule,
  saveExecutiveSchedule,
  downloadExecutiveReport,
  type ExecutiveKpiResponse,
  type ExecutiveScheduleSettings,
  type UpdateExecutiveSchedulePayload,
} from './api';

export const EXECUTIVE_TRENDS_QUERY_KEY = 'executive-trends';
export const EXECUTIVE_SCHEDULE_QUERY_KEY = 'executive-schedule';

export const useExecutiveTrends = (months: number) =>
  useQuery<ExecutiveKpiResponse>([EXECUTIVE_TRENDS_QUERY_KEY, months], () => fetchExecutiveTrends(months), {
    keepPreviousData: true,
  });

export const useExecutiveSchedule = () =>
  useQuery<ExecutiveScheduleSettings>(EXECUTIVE_SCHEDULE_QUERY_KEY, fetchExecutiveSchedule, {
    staleTime: 60_000,
  });

export const useSaveExecutiveSchedule = () => {
  const queryClient = useQueryClient();
  return useMutation((payload: UpdateExecutiveSchedulePayload) => saveExecutiveSchedule(payload), {
    onSuccess: () => {
      void queryClient.invalidateQueries(EXECUTIVE_SCHEDULE_QUERY_KEY);
    },
  });
};

export const useDownloadExecutiveReport = () =>
  useMutation((months?: number) => downloadExecutiveReport(months));
