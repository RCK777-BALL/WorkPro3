import React, { useEffect, useState } from 'react';
import Layout from '../components/layout/Layout';
import { useAuthStore } from '../store/authStore';
import { useDashboardStore } from '../store/dashboardStore';
import { useSocketStore } from '../store/socketStore';
import useDashboardData from '../hooks/useDashboardData';
import { useSummary } from '../hooks/useSummaryData';
import api from '../utils/api';
import { getChatSocket } from '../utils/chatSocket';
import DashboardStats from '../components/dashboard/DashboardStats';
import WorkOrdersChart from '../components/dashboard/WorkOrdersChart';
import AssetsStatusChart from '../components/dashboard/AssetsStatusChart';
import UpcomingMaintenance from '../components/dashboard/UpcomingMaintenance';
import CriticalAlerts from '../components/dashboard/CriticalAlerts';
import LowStockParts from '../components/dashboard/LowStockParts';

import type {
  Department,
  DashboardSummary,
  LowStockPart,
  LowStockPartResponse,
} from '../types';


const Dashboard: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const selectedRole = useDashboardStore((s) => s.selectedRole);
  const connected = useSocketStore((s) => s.connected);

  const {
    workOrdersByStatus,
    assetsByStatus,
    upcomingMaintenance,
    criticalAlerts,
    refresh,
    loading,
  } = useDashboardData(selectedRole);

  const [stats, setStats] = useState({
    totalAssets: 0,
    activeWorkOrders: 0,
    maintenanceCompliance: 0,
    inventoryAlerts: 0,
  });
  const [lowStockParts, setLowStockParts] = useState<LowStockPart[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);

  // summaries (auto-refetch when selectedRole changes)
  const [summary] = useSummary<DashboardSummary>(
    `/summary${selectedRole ? `?role=${selectedRole}` : ''}`,
    [selectedRole],
  );
  const [lowStock] = useSummary<LowStockPartResponse[]>(
    `/summary/low-stock${selectedRole ? `?role=${selectedRole}` : ''}`,
    [selectedRole],
  );
  const [departmentsData] = useSummary<Department[]>('/departments', [], { ttlMs: 60_000 });

  // map summaries to local state
  useEffect(() => {
    const mapped = Array.isArray(lowStock)
      ? lowStock.map((p) => ({
          id: p._id ?? p.id!,
          name: p.name,
          quantity: p.quantity,
          reorderPoint: p.reorderThreshold ?? p.reorderPoint ?? 0,
        }))
      : [];
    setLowStockParts(mapped);

    setStats({
      totalAssets: summary?.totalAssets || 0,
      activeWorkOrders: summary?.activeWorkOrders || 0,
      maintenanceCompliance:
        summary && summary.totalWorkOrders > 0
          ? Math.round((summary.completedWorkOrders / summary.totalWorkOrders) * 100)
          : 0,
      inventoryAlerts: mapped.length,
    });
  }, [summary, lowStock]);

  // departments list
  useEffect(() => {
    if (Array.isArray(departmentsData)) setDepartments(departmentsData);
  }, [departmentsData]);

  // analytics (optional)
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const query = selectedRole ? `?role=${selectedRole}` : '';
        const res = await api.get(`/reports/analytics${query}`);
        setAnalytics(res.data);
      } catch (err) {
        console.error('Error fetching analytics', err);
      }
    };
    fetchAnalytics();
  }, [selectedRole]);

  // socket-driven refresh
  useEffect(() => {
    const s = getChatSocket?.();
    if (!s) return;

    const doRefresh = async () => {
      try { await refresh(); } catch (e) { console.error('refresh failed', e); }
    };

    const handleLowStockUpdate = (parts: LowStockPartResponse[]) => {
      const mapped = Array.isArray(parts)
        ? parts.map((p) => ({
            id: p._id ?? p.id!,
            name: p.name,
            quantity: p.quantity,
            reorderPoint: p.reorderThreshold ?? p.reorderPoint ?? 0,
          }))
        : [];
      setLowStockParts(mapped);
      setStats((prev) => ({ ...prev, inventoryAlerts: mapped.length }));
    };

    s.on('inventoryUpdated', doRefresh);
    s.on('workOrderUpdated', doRefresh);
    s.on('lowStockUpdated', handleLowStockUpdate);
    s.on('pmCompletionUpdated', (data: any) => {
      const value =
        typeof data === 'number'
          ? data
          : typeof data?.maintenanceCompliance === 'number'
          ? data.maintenanceCompliance
          : 0;
      setStats((prev) => ({ ...prev, maintenanceCompliance: value }));
    });

    return () => {
      s.off('inventoryUpdated', doRefresh);
      s.off('workOrderUpdated', doRefresh);
      s.off('lowStockUpdated', handleLowStockUpdate);
      s.off('pmCompletionUpdated');
    };
  }, [refresh, connected]);

  return (
    <Layout title="Dashboard">
      <div className="px-4 py-6 space-y-6">
        <div className="flex items-baseline justify-between">
          <h1 className="text-2xl font-semibold">Welcome{user?.name ? `, ${user.name}` : ''}</h1>
          {loading && <span className="text-sm opacity-70">Refreshing…</span>}
        </div>

        {/* Top stats */}
        <DashboardStats stats={stats} />

        {/* Status summaries */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <WorkOrdersChart data={workOrdersByStatus} />
          <AssetsStatusChart data={assetsByStatus} />
        </div>

        {/* Upcoming maintenance, alerts, and low stock */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <UpcomingMaintenance
            maintenanceItems={upcomingMaintenance.slice(0, 8)}
            onComplete={(id) => {
              /* Placeholder for completion action */
              console.log('Complete maintenance', id);
            }}
          />
          <CriticalAlerts alerts={criticalAlerts.slice(0, 8)} />
          <LowStockParts parts={lowStockParts.slice(0, 8)} />
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
