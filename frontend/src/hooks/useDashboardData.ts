/* eslint-disable react-hooks/exhaustive-deps */
/*
 * SPDX-License-Identifier: MIT
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import http from '@/lib/http';
import type {
  StatusCountResponse,
  UpcomingMaintenanceResponse,
  CriticalAlertResponse,
  UpcomingMaintenanceItem,
  CriticalAlertItem,
  AssetStatusMap,
  MaintenanceType,
} from '@/types';
import type { DateRange, Timeframe } from '@/store/dashboardStore';

// normalize backend work-order status keys to camelCase
const normalizeWOKey = (key: string): keyof WorkOrderStatusMap => {
  if (key === 'in_progress') return 'inProgress';
  return key as keyof WorkOrderStatusMap;
};

interface WorkOrderStatusMap {
  requested: number;
  assigned: number;
  inProgress: number;
  completed: number;
  cancelled: number;
}

const defaultWOStatus: WorkOrderStatusMap = {
  requested: 0,
  assigned: 0,
  inProgress: 0,
  completed: 0,
  cancelled: 0,
};

 const defaultAssetStatus: AssetStatusMap = {};
 

// simple debounce helper
interface Cancelable {
  cancel: () => void;
}
function debounce<F extends (...args: unknown[]) => void>(fn: F, delay: number): F & Cancelable {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const debounced = (...args: Parameters<F>) => {
    if (timer) clearTimeout(timer);
    if (typeof window !== 'undefined') {
      timer = setTimeout(() => fn(...args), delay);
    }
  };
  const wrapped = debounced as F & Cancelable;
  wrapped.cancel = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };
  return wrapped;
}

export default function useDashboardData(
  role?: string,
  department?: string,
  timeframe?: Timeframe,
  range?: DateRange,
) {
  const [workOrdersByStatus, setWorkOrdersByStatus] = useState<WorkOrderStatusMap>(defaultWOStatus);
  const [assetsByStatus, setAssetsByStatus] = useState<AssetStatusMap>(defaultAssetStatus);
  const [upcomingMaintenance, setUpcomingMaintenance] = useState<UpcomingMaintenanceItem[]>([]);
  const [criticalAlerts, setCriticalAlerts] = useState<CriticalAlertItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (role && role !== 'all') params.append('role', role);
      if (department && department !== 'all') params.append('department', department);
      if (timeframe) {
        params.append('timeframe', timeframe);
        if (timeframe === 'custom' && range) {
          params.append('start', range.start);
          params.append('end', range.end);
        }
      }
      const query = params.toString() ? `?${params.toString()}` : '';

      const [woRes, assetRes, upcomingRes, alertRes] = await Promise.all([
        http.get<StatusCountResponse[]>(`/summary/workorders${query}`),
        http.get<StatusCountResponse[]>(`/summary/assets${query}`),
        http.get<UpcomingMaintenanceResponse[]>(`/summary/upcoming-maintenance${query}`),
        http.get<CriticalAlertResponse[]>(`/summary/critical-alerts${query}`),
      ]);

      // Work orders
      const woCounts: WorkOrderStatusMap = { ...defaultWOStatus };
      if (Array.isArray(woRes.data)) {
        woRes.data.forEach(({ _id, count }) => {
          const key = normalizeWOKey(_id as string);
          if (key in woCounts) woCounts[key] = count;
        });
      }
      setWorkOrdersByStatus(woCounts);

      // Assets
      const assetCounts: AssetStatusMap = {};
      if (Array.isArray(assetRes.data)) {
        assetRes.data.forEach(({ _id, count }) => {
          assetCounts[_id as string] = count;
        });
      }
      setAssetsByStatus(assetCounts);

      // Upcoming maintenance
      const upcoming: UpcomingMaintenanceItem[] = Array.isArray(upcomingRes.data)
        ? upcomingRes.data.map((u) => ({
            id: u._id ?? u.id ?? '',
            assetName: u.asset?.name ?? 'Unknown',
            assetId: u.asset?._id ?? u.asset?.id ?? '',
            date: u.nextDue,
             type: (u.type ?? 'preventive') as MaintenanceType,
 
            assignedTo: u.assignedTo ?? '',
            estimatedDuration: u.estimatedDuration ?? 0,
          }))
        : [];
      setUpcomingMaintenance(upcoming);

      // Critical alerts
      const alerts: CriticalAlertItem[] = Array.isArray(alertRes.data)
        ? alertRes.data.map((a) => ({
            id: a._id ?? a.id ?? '',
            assetName: a.asset?.name ?? 'Unknown',
            severity: a.priority,
            issue: a.description ?? a.title ?? '',
            timestamp: a.createdAt,
          }))
        : [];
      setCriticalAlerts(alerts);
    } catch (err) {
      console.error('dashboard refresh failed', err);
       setError('Failed to refresh dashboard data');
 
    } finally {
      setLoading(false);
    }
  }, [role, department, timeframe, range?.start, range?.end]);

  const refresh = useMemo(() => debounce(refreshData, 300), [refreshData]);

  useEffect(() => {
    refresh();
    return () => refresh.cancel();
  }, [refresh]);

  return {
    workOrdersByStatus,
    assetsByStatus,
    upcomingMaintenance,
    criticalAlerts,
    refresh,
    loading,
    error,
  };
}

