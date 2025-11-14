/*
 * SPDX-License-Identifier: MIT
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import http from '@/lib/http';

export type DashboardKpiResponse = {
  statuses: { status: string; count: number }[];
  overdue: number;
  pmCompliance: { total: number; completed: number; percentage: number };
  downtimeHours: number;
  maintenanceCost: number;
  mttr: number;
  mtbf: number;
};

export const DASHBOARD_RANGE_OPTIONS = [
  { label: 'Last 30 days', value: '30d', days: 30 },
  { label: 'Last 90 days', value: '90d', days: 90 },
  { label: 'Last 12 months', value: '365d', days: 365 },
  { label: 'All time', value: 'all' },
] as const;

export type DashboardRangeKey = (typeof DASHBOARD_RANGE_OPTIONS)[number]['value'];

const DEFAULT_RANGE: DashboardRangeKey = '30d';

export type DashboardAnalyticsState = {
  data: DashboardKpiResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  params: Record<string, string> | undefined;
};

const buildQueryParams = (range: DashboardRangeKey): Record<string, string> | undefined => {
  const option = DASHBOARD_RANGE_OPTIONS.find((item) => item.value === range);
  if (!option || option.value === 'all' || !option.days) {
    return undefined;
  }
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - option.days);
  return {
    startDate: start.toISOString(),
    endDate: now.toISOString(),
  };
};

export const useDashboardAnalytics = (
  range: DashboardRangeKey = DEFAULT_RANGE,
): DashboardAnalyticsState => {
  const [data, setData] = useState<DashboardKpiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const queryParams = useMemo(() => buildQueryParams(range), [range]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await http.get<DashboardKpiResponse>('/analytics/dashboard/kpis', {
        params: queryParams,
      });
      setData(response.data);
    } catch (err) {
      // eslint-disable-next-line no-console -- surfaced for observability during development
      console.error('Failed to load dashboard KPIs', err);
      setError('Unable to load maintenance KPIs. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [queryParams]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData, params: queryParams };
};
