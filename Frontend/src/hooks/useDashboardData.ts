import { useState, useCallback, useEffect } from 'react';
import {
  fetchAssetSummary,
  fetchWorkOrderSummary,
  fetchUpcomingMaintenance,
  fetchCriticalAlerts,
} from '../utils/api';
import type {
  StatusCount,
  UpcomingMaintenanceResponse,
  UpcomingMaintenanceItem,
  CriticalAlertResponse,
  CriticalAlertItem,
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

  const [upcomingMaintenance, setUpcomingMaintenance] = useState<
    UpcomingMaintenanceItem[]
  >([]);
  const [criticalAlerts, setCriticalAlerts] = useState<CriticalAlertItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const params = role ? { role } : undefined;
      const [assetSummaryData, workOrders, upcoming, alerts] = await Promise.all([
        fetchAssetSummary<StatusCount[]>(params),
        fetchWorkOrderSummary<StatusCount[]>(params),
        fetchUpcomingMaintenance<UpcomingMaintenanceResponse[]>(params),
        fetchCriticalAlerts<CriticalAlertResponse[]>(params),
      ]);

      const statusCounts: WorkOrderStatusCounts = {
        open: 0,
        inProgress: 0,
        onHold: 0,
        completed: 0,
      };
      if (Array.isArray(workOrders)) {
        workOrders.forEach((w) => {
          statusCounts[w._id as keyof WorkOrderStatusCounts] = w.count;
        });
      }
      setWorkOrdersByStatus(statusCounts);

      const assetCounts: AssetStatusCounts = {
        Active: 0,
        Offline: 0,
        'In Repair': 0,
      };
      if (Array.isArray(assetSummaryData)) {
        assetSummaryData.forEach((a) => {
          assetCounts[a._id as keyof AssetStatusCounts] = a.count;
        });
      }
      setAssetsByStatus(assetCounts);

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
