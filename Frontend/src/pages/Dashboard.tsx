import { useState, useCallback, useEffect } from 'react';
import {
  fetchAssetSummary,
  fetchWorkOrderSummary,
  fetchUpcomingMaintenance,
  fetchCriticalAlerts,
} from '../utils/api';
import type {
  StatusCountResponse,
  UpcomingMaintenanceItem,
  UpcomingMaintenanceResponse,
  CriticalAlertItem,
  CriticalAlertResponse,
  WorkOrderStatus,
  AssetStatus,
} from '../types';

interface WorkOrderStatusCounts {
  open: number;
  inProgress: number;
  onHold: number;
  completed: number;
}
interface AssetStatusCounts {
  Active: number;
  Offline: number;
  'In Repair': number;
}

const WO_KEYS: WorkOrderStatus[] = ['open', 'inProgress', 'onHold', 'completed'];
const ASSET_KEYS: AssetStatus[] = ['Active', 'Offline', 'In Repair'];

const isWorkOrderStatus = (k: unknown): k is keyof WorkOrderStatusCounts =>
  typeof k === 'string' && (WO_KEYS as readonly string[]).includes(k);

const isAssetStatus = (k: unknown): k is keyof AssetStatusCounts =>
  typeof k === 'string' && (ASSET_KEYS as readonly string[]).includes(k);

const useDashboardData = (role?: string) => {
  const [workOrdersByStatus, setWorkOrdersByStatus] = useState<WorkOrderStatusCounts>({
    open: 0,
    inProgress: 0,
    onHold: 0,
    completed: 0,
  });

  const [assetsByStatus, setAssetsByStatus] = useState<AssetStatusCounts>({
    Active: 0,
    Offline: 0,
    'In Repair': 0,
  });

  const [upcomingMaintenance, setUpcomingMaintenance] = useState<UpcomingMaintenanceItem[]>([]);
  const [criticalAlerts, setCriticalAlerts] = useState<CriticalAlertItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const params = role ? { role } : undefined;

      const [assetSummaryData, workOrders, upcoming, alerts] = await Promise.all<
        [
          StatusCountResponse<AssetStatus>[],
          StatusCountResponse<WorkOrderStatus>[],
          UpcomingMaintenanceResponse[],
          CriticalAlertResponse[],
        ]
      >([
        fetchAssetSummary(params),
        fetchWorkOrderSummary(params),
        fetchUpcomingMaintenance(params),
        fetchCriticalAlerts(params),
      ]);

      // Work order status counts
      const nextWO: WorkOrderStatusCounts = { open: 0, inProgress: 0, onHold: 0, completed: 0 };
      for (const w of workOrders ?? []) {
        if (isWorkOrderStatus(w._id)) nextWO[w._id] = w.count ?? 0;
      }
      setWorkOrdersByStatus(nextWO);

      // Asset status counts
      const nextAsset: AssetStatusCounts = { Active: 0, Offline: 0, 'In Repair': 0 };
      for (const a of assetSummaryData ?? []) {
        if (isAssetStatus(a._id)) nextAsset[a._id] = a.count ?? 0;
      }
      setAssetsByStatus(nextAsset);

      // Upcoming maintenance
      setUpcomingMaintenance(
        Array.isArray(upcoming)
          ? upcoming.map<UpcomingMaintenanceItem>((t) => ({
              id: t._id ?? t.id ?? '',
              assetName: t.asset?.name || 'Unknown',
              assetId: t.asset?._id ?? '',
              date: t.nextDue,
              type: t.type || 'preventive',
              assignedTo: t.assignedTo || '',
              estimatedDuration: t.estimatedDuration || 0,
            }))
          : [],
      );

      // Critical alerts
      setCriticalAlerts(
        Array.isArray(alerts)
          ? alerts.map<CriticalAlertItem>((a) => ({
              id: a._id ?? a.id ?? '',
              assetName: a.asset?.name || 'Unknown',
              severity: a.priority,
              issue: a.description || a.title || '',
              timestamp: a.createdAt,
            }))
          : [],
      );
    } catch (err) {
      console.error('Failed to load summary data', err);
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    let active = true;
    (async () => {
      await refresh();
      if (!active) return;
    })();
    return () => {
      active = false;
    };
  }, [refresh]);

  return {
    workOrdersByStatus,
    assetsByStatus,
    upcomingMaintenance,
    criticalAlerts,
    refresh,
    loading,
  };
};

export default useDashboardData;
