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
  partsSpend: number;
  backlogAgingDays: number;
  laborUtilization: number;
  mttr: number;
  mtbf: number;
};

export type TrendPoint = { period: string; value: number };

export type MetricWithTrend = { value: number; trend: TrendPoint[] };

export type PmComplianceMetric = {
  total: number;
  completed: number;
  percentage: number;
  trend: TrendPoint[];
};

export type WorkOrderVolumeMetric = {
  total: number;
  byStatus: { status: string; count: number }[];
  trend: TrendPoint[];
};

export const DASHBOARD_RANGE_OPTIONS = [
  { label: 'Last 30 days', value: '30d', days: 30 },
  { label: 'Last 90 days', value: '90d', days: 90 },
  { label: 'Last 12 months', value: '365d', days: 365 },
  { label: 'All time', value: 'all' },
] as const;

export type DashboardRangeKey = (typeof DASHBOARD_RANGE_OPTIONS)[number]['value'];

const DEFAULT_RANGE: DashboardRangeKey = '30d';

export type DashboardAnalyticsData = {
  kpis: DashboardKpiResponse;
  mtbf: MetricWithTrend;
  pmCompliance: PmComplianceMetric;
  workOrderVolume: WorkOrderVolumeMetric;
};

export type DashboardAnalyticsState = {
  data: DashboardAnalyticsData | null;
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
  const [data, setData] = useState<DashboardAnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const queryParams = useMemo(() => buildQueryParams(range), [range]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [kpiResponse, mtbfResponse, pmResponse, volumeResponse] = await Promise.all([
        http.get<DashboardKpiResponse>('/analytics/dashboard/kpis', {
          params: queryParams,
        }),
        http.get<MetricWithTrend>('/analytics/dashboard/mtbf', { params: queryParams }),
        http.get<PmComplianceMetric>('/analytics/dashboard/pm-compliance', { params: queryParams }),
        http.get<WorkOrderVolumeMetric>('/analytics/dashboard/work-order-volume', { params: queryParams }),
      ]);
      setData({
        kpis: kpiResponse.data,
        mtbf: mtbfResponse.data,
        pmCompliance: pmResponse.data,
        workOrderVolume: volumeResponse.data,
      });
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
