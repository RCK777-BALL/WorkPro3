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
          StatusCountResponse[],
          StatusCountResponse[],
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
      const statusCounts: WorkOrderStatusCounts = {
        open: 0,
        inProgress: 0,
        onHold: 0,
        completed: 0,
      };
      if (Array.isArray(workOrders)) {
        workOrders.forEach((w) => {
          const key = w._id as keyof WorkOrderStatusCounts;
          if (key in statusCounts) statusCounts[key] = w.count ?? 0;
        });
      }
      setWorkOrdersByStatus(statusCounts);

      // Asset status counts
      const assetCounts: AssetStatusCounts = {
        Active: 0,
        Offline: 0,
        'In Repair': 0,
      };
      if (Array.isArray(assetSummaryData)) {
        assetSummaryData.forEach((a) => {
          const key = a._id as keyof AssetStatusCounts;
          if (key in assetCounts) assetCounts[key] = a.count ?? 0;
        });
      }
      setAssetsByStatus(assetCounts);

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
    refresh();
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
