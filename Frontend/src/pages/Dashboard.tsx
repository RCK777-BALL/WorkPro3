import React, { useEffect, useState } from 'react';
import Layout from '../components/layout/Layout';
import { useAuthStore } from '../store/authStore';
import { useDashboardStore } from '../store/dashboardStore';
import { useSocketStore } from '../store/socketStore';
import useDashboardData from '../hooks/useDashboardData';
import { useSummary } from '../hooks/useSummaryData';
import api from '../utils/api';
import { getNotificationsSocket } from '../utils/notificationsSocket';

import type {
  Department,
  DashboardSummary,
  LowStockPart,
  LowStockPartResponse,
} from '../types';

// time-ago helper
const getTimeAgo = (timestamp: string): string => {
  const now = new Date();
  const date = new Date(timestamp);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

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
    const s = getNotificationsSocket();

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border p-4">
            <div className="text-sm opacity-70">Total Assets</div>
            <div className="text-2xl font-bold">{stats.totalAssets}</div>
          </div>
          <div className="rounded-xl border p-4">
            <div className="text-sm opacity-70">Active Work Orders</div>
            <div className="text-2xl font-bold">{stats.activeWorkOrders}</div>
          </div>
          <div className="rounded-xl border p-4">
            <div className="text-sm opacity-70">Maintenance Compliance</div>
            <div className="text-2xl font-bold">{stats.maintenanceCompliance}%</div>
          </div>
          <div className="rounded-xl border p-4">
            <div className="text-sm opacity-70">Inventory Alerts</div>
            <div className="text-2xl font-bold">{stats.inventoryAlerts}</div>
          </div>
        </div>

        {/* Status summaries */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl border p-4">
            <h2 className="font-semibold mb-2">Work Orders by Status</h2>
            <ul className="space-y-1 text-sm">
              <li>Open: <b>{workOrdersByStatus?.open ?? 0}</b></li>
              <li>In Progress: <b>{workOrdersByStatus?.inProgress ?? 0}</b></li>
              <li>On Hold: <b>{workOrdersByStatus?.onHold ?? 0}</b></li>
              <li>Completed: <b>{workOrdersByStatus?.completed ?? 0}</b></li>
            </ul>
          </div>
          <div className="rounded-xl border p-4">
            <h2 className="font-semibold mb-2">Assets by Status</h2>
            <ul className="space-y-1 text-sm">
              <li>Active: <b>{assetsByStatus?.Active ?? 0}</b></li>
              <li>Offline: <b>{assetsByStatus?.Offline ?? 0}</b></li>
              <li>In Repair: <b>{assetsByStatus?.['In Repair'] ?? 0}</b></li>
            </ul>
          </div>
        </div>

        {/* Upcoming maintenance & alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl border p-4">
            <h2 className="font-semibold mb-2">Upcoming Maintenance</h2>
            <ul className="space-y-2 text-sm">
              {upcomingMaintenance.slice(0, 8).map((u) => (
                <li key={u.id} className="flex justify-between">
                  <span>{u.assetName} — {u.type}</span>
                  <span className="opacity-70">{u.date}</span>
                </li>
              ))}
              {upcomingMaintenance.length === 0 && <li className="opacity-70">No upcoming tasks</li>}
            </ul>
          </div>

          <div className="rounded-xl border p-4">
            <h2 className="font-semibold mb-2">Critical Alerts</h2>
            <ul className="space-y-2 text-sm">
              {criticalAlerts.slice(0, 8).map((a) => (
                <li key={a.id} className="flex justify-between">
                  <span>{a.assetName} — {a.issue}</span>
                  <span className="opacity-70">{getTimeAgo(a.timestamp)}</span>
                </li>
              ))}
              {criticalAlerts.length === 0 && <li className="opacity-70">No critical alerts</li>}
            </ul>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
