import { useState, useCallback, useEffect } from 'react';
import {
  fetchAssetSummary,
  fetchWorkOrderSummary,
  fetchUpcomingMaintenance,
  fetchCriticalAlerts,
} from '../utils/api';

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

  const [upcomingMaintenance, setUpcomingMaintenance] = useState<any[]>([]);
  const [criticalAlerts, setCriticalAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const params = role ? { role } : undefined;
      const [assetSummaryData, workOrders, upcoming, alerts] = await Promise.all([
        fetchAssetSummary(params),
        fetchWorkOrderSummary(params),
        fetchUpcomingMaintenance(params),
        fetchCriticalAlerts(params),
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
          ? upcoming.map((t) => ({
              id: t._id ?? t.id,
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
          ? alerts.map((a) => ({
              id: a._id ?? a.id,
              assetName: a.asset?.name || 'Unknown',
              severity: a.priority,
              issue: a.description || a.title,
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
