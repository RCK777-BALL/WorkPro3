import { useCallback, useEffect, useState } from 'react';
import api from '../utils/api';
import type {
  StatusCountResponse,
  UpcomingMaintenanceResponse,
  CriticalAlertResponse,
  UpcomingMaintenanceItem,
  CriticalAlertItem,
} from '../types';

// normalize backend work-order status keys to camelCase
const normalizeWOKey = (key: string): keyof WorkOrderStatusMap => {
  if (key === 'in-progress') return 'inProgress';
  if (key === 'on-hold') return 'onHold';
  return key as keyof WorkOrderStatusMap;
};

interface WorkOrderStatusMap {
  open: number;
  inProgress: number;
  onHold: number;
  completed: number;
}

const defaultWOStatus: WorkOrderStatusMap = {
  open: 0,
  inProgress: 0,
  onHold: 0,
  completed: 0,
};

interface AssetStatusMap {
  Active: number;
  Offline: number;
  'In Repair': number;
}

const defaultAssetStatus: AssetStatusMap = {
  Active: 0,
  Offline: 0,
  'In Repair': 0,
};

export default function useDashboardData(role?: string) {
  const [workOrdersByStatus, setWorkOrdersByStatus] = useState<WorkOrderStatusMap>(defaultWOStatus);
  const [assetsByStatus, setAssetsByStatus] = useState<AssetStatusMap>(defaultAssetStatus);
  const [upcomingMaintenance, setUpcomingMaintenance] = useState<UpcomingMaintenanceItem[]>([]);
  const [criticalAlerts, setCriticalAlerts] = useState<CriticalAlertItem[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const query = role ? `?role=${role}` : '';
      const [woRes, assetRes, upcomingRes, alertRes] = await Promise.all([
        api.get<StatusCountResponse[]>(`/summary/workorders${query}`),
        api.get<StatusCountResponse[]>(`/summary/assets${query}`),
        api.get<UpcomingMaintenanceResponse[]>(`/summary/upcoming-maintenance${query}`),
        api.get<CriticalAlertResponse[]>(`/summary/critical-alerts${query}`),
      ]);

      const woCounts: WorkOrderStatusMap = { ...defaultWOStatus };
      if (Array.isArray(woRes.data)) {
        woRes.data.forEach(({ _id, count }) => {
          const key = normalizeWOKey(_id as string);
          if (key in woCounts) woCounts[key] = count;
        });
      }
      setWorkOrdersByStatus(woCounts);

      const assetCounts: AssetStatusMap = { ...defaultAssetStatus };
      if (Array.isArray(assetRes.data)) {
        assetRes.data.forEach(({ _id, count }) => {
          if (_id in assetCounts) {
            assetCounts[_id as keyof AssetStatusMap] = count;
          }
        });
      }
      setAssetsByStatus(assetCounts);

      const upcoming: UpcomingMaintenanceItem[] = Array.isArray(upcomingRes.data)
        ? upcomingRes.data.map((u) => ({
            id: u._id ?? u.id ?? '',
            assetName: u.asset?.name ?? 'Unknown',
            assetId: u.asset?._id ?? u.asset?.id ?? '',
            date: u.nextDue,
            type: u.type ?? '',
            assignedTo: u.assignedTo ?? '',
            estimatedDuration: u.estimatedDuration ?? 0,
          }))
        : [];
      setUpcomingMaintenance(upcoming);

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
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);

  return {
    workOrdersByStatus,
    assetsByStatus,
    upcomingMaintenance,
    criticalAlerts,
    refresh,
    loading,
  };
}
