/*
 * SPDX-License-Identifier: MIT
 */

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

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
  useQuery<ExecutiveKpiResponse>({
    queryKey: [EXECUTIVE_TRENDS_QUERY_KEY, months],
    queryFn: () => fetchExecutiveTrends(months),
    placeholderData: keepPreviousData,
  });

export const useExecutiveSchedule = () =>
  useQuery<ExecutiveScheduleSettings>({
    queryKey: [EXECUTIVE_SCHEDULE_QUERY_KEY],
    queryFn: fetchExecutiveSchedule,
    staleTime: 60_000,
  });

export const useSaveExecutiveSchedule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateExecutiveSchedulePayload) => saveExecutiveSchedule(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [EXECUTIVE_SCHEDULE_QUERY_KEY] });
    },
  });
};

export const useDownloadExecutiveReport = () =>
  useMutation({
    mutationFn: (months?: number) => downloadExecutiveReport(months),
  });

