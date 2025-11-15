/*
 * SPDX-License-Identifier: MIT
 */

import type { AxiosResponse } from 'axios';

import http from '@/lib/http';

export interface ExecutiveTrendPoint {
  period: string;
  downtimeHours: number;
  compliance: number;
  maintenanceCost: number;
  reliability: number;
}

export interface ExecutiveNarrative {
  summary: string;
  highlights: string[];
  latestPeriod: string | null;
  confidence: number;
}

export interface ExecutiveKpiResponse {
  points: ExecutiveTrendPoint[];
  averages: {
    downtimeHours: number;
    compliance: number;
    maintenanceCost: number;
    reliability: number;
  };
  months: number;
  narrative: ExecutiveNarrative;
}

export interface ExecutiveScheduleSettings {
  enabled: boolean;
  cron: string;
  timezone: string;
  recipients: string[];
  lastRunAt?: string | null;
  lastRunStatus?: 'success' | 'error';
  lastRunError?: string;
}

export interface UpdateExecutiveSchedulePayload {
  enabled?: boolean;
  cron?: string;
  timezone?: string;
  recipients?: string[];
}

export const fetchExecutiveTrends = async (months?: number): Promise<ExecutiveKpiResponse> => {
  const response = await http.get<ExecutiveKpiResponse>('/executive/trends', {
    params: months ? { months } : undefined,
  });
  return response.data;
};

export const fetchExecutiveSchedule = async (): Promise<ExecutiveScheduleSettings> => {
  const response = await http.get<ExecutiveScheduleSettings>('/executive/schedule');
  return response.data;
};

export const saveExecutiveSchedule = async (
  payload: UpdateExecutiveSchedulePayload,
): Promise<ExecutiveScheduleSettings> => {
  const response = await http.put<ExecutiveScheduleSettings>('/executive/schedule', payload);
  return response.data;
};

export const downloadExecutiveReport = async (
  months?: number,
): Promise<AxiosResponse<Blob>> => {
  const response = await http.post<Blob>(
    '/executive/reports/pdf',
    { months },
    { responseType: 'blob' },
  );
  return response;
};
