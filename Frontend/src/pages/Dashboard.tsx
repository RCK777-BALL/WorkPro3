import React, { useEffect, useRef, useState } from 'react';
import Layout from '../components/layout/Layout';
import { useAuthStore } from '../store/authStore';
import { useDashboardStore } from '../store/dashboardStore';
import { useSocketStore } from '../store/socketStore';
import useDashboardData from '../hooks/useDashboardData';
import { useSummary } from '../hooks/useSummaryData';
import api from '../utils/api';
import FiltersBar from '../components/dashboard/FiltersBar';
import {
  getNotificationsSocket,
  closeNotificationsSocket,
  startNotificationsPoll,
  stopNotificationsPoll,
} from '../utils/notificationsSocket';
import { useNavigate } from 'react-router-dom';

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
  const { selectedRole, selectedDepartment, selectedTimeframe, customRange } =
    useDashboardStore((s) => ({
      selectedRole: s.selectedRole,
      selectedDepartment: s.selectedDepartment,
      selectedTimeframe: s.selectedTimeframe,
      customRange: s.customRange,
    }));
  const connected = useSocketStore((s) => s.connected);
  const navigate = useNavigate();

  const handleKeyDown = (path: string) => (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      navigate(path);
    }
  };

  const [liveData, setLiveData] = useState(true);
  const pollActive = useRef(false);

  const {
    workOrdersByStatus,
    assetsByStatus,
    upcomingMaintenance,
    criticalAlerts,
    refresh,
    loading,
  } = useDashboardData(
    selectedRole,
    selectedDepartment,
    selectedTimeframe,
    customRange,
  );

  const [stats, setStats] = useState({
    totalAssets: 0,
    activeWorkOrders: 0,
    maintenanceCompliance: 0,
    inventoryAlerts: 0,
  });
  const [lowStockParts, setLowStockParts] = useState<LowStockPart[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [, setAnalytics] = useState<any | null>(null); // optional analytics state

  const buildQuery = () => {
    const params = new URLSearchParams();
    if (selectedDepartment !== 'all') params.append('department', selectedDepartment);
    if (selectedRole !== 'all') params.append('role', selectedRole);
    if (selectedTimeframe) {
      params.append('timeframe', selectedTimeframe);
      if (selectedTimeframe === 'custom') {
        params.append('start', customRange.start);
        params.append('end', customRange.end);
      }
    }
    const q = params.toString();
    return q ? `?${q}` : '';
  };

  const query = buildQuery();

  // summaries (auto-refetch when filters change)
  const [summary] = useSummary<DashboardSummary>(
    `/summary${query}`,
    [selectedDepartment, selectedRole, selectedTimeframe, customRange.start, customRange.end],
  );
  const [lowStock] = useSummary<LowStockPartResponse[]>(
    `/summary/low-stock${query}`,
    [selectedDepartment, selectedRole, selectedTimeframe, customRange.start, customRange.end],
  );
  const [departmentsData] = useSummary<Department[]>(
    '/summary/departments',
    [],
    { ttlMs: 60_000 },
  );

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
        const res = await api.get(`/reports/analytics${buildQuery()}`);
        setAnalytics(res.data);
      } catch (err) {
        console.error('Error fetching analytics', err);
      }
    };
    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDepartment, selectedRole, selectedTimeframe, customRange]);

  // socket-driven refresh
  useEffect(() => {
    if (!liveData) {
      closeNotificationsSocket();
      stopNotificationsPoll();
      pollActive.current = false;
      return;
    }

    const s = getNotificationsSocket();

    const doRefresh = async () => {
      try {
        await refresh();
      } catch (e) {
        console.error('refresh failed', e);
      }
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
    s.on('notification', doRefresh);

    let timer: ReturnType<typeof setTimeout> | undefined;
    if (s.disconnected) {
      timer = setTimeout(() => {
        if (s.disconnected && !pollActive.current) {
          startNotificationsPoll(doRefresh);
          pollActive.current = true;
        }
      }, 10_000);
    }

    s.on('connect', () => {
      if (pollActive.current) {
        stopNotificationsPoll();
        pollActive.current = false;
      }
    });

    return () => {
      s.off('inventoryUpdated', doRefresh);
      s.off('workOrderUpdated', doRefresh);
      s.off('lowStockUpdated', handleLowStockUpdate);
      s.off('pmCompletionUpdated');
      s.off('notification', doRefresh);
      if (timer) clearTimeout(timer);
      stopNotificationsPoll();
      pollActive.current = false;
    };
  }, [refresh, connected, liveData]);

  return (
    <Layout title="Dashboard">
      <div className="px-4 py-6 space-y-6">
        <div className="flex items-baseline justify-between">
          <h1 className="text-2xl font-semibold">Welcome{user?.name ? `, ${user.name}` : ''}</h1>
          <div className="flex items-center gap-2">
            {loading && <span className="text-sm opacity-70">Refreshing…</span>}
            <button
              className="text-sm border px-2 py-1 rounded"
              onClick={() => setLiveData((v) => !v)}
            >
              {liveData ? 'Live On' : 'Live Off'}
            </button>
          </div>
        </div>

        <FiltersBar departments={departments} />

        {/* Top stats with keyboard-accessible navigation */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            role="button"
            tabIndex={0}
            onClick={() => navigate('/assets')}
            onKeyDown={handleKeyDown('/assets')}
            className="rounded-xl border p-4 cursor-pointer hover:bg-neutral-50"
          >
            <div className="text-sm opacity-70">Total Assets</div>
            <div className="text-2xl font-bold">{stats.totalAssets}</div>
          </div>
          <div
            role="button"
            tabIndex={0}
            onClick={() => navigate('/workorders?status=open')}
            onKeyDown={handleKeyDown('/workorders?status=open')}
            className="rounded-xl border p-4 cursor-pointer hover:bg-neutral-50"
          >
            <div className="text-sm opacity-70">Active Work Orders</div>
            <div className="text-2xl font-bold">{stats.activeWorkOrders}</div>
          </div>
          <div
            role="button"
            tabIndex={0}
            onClick={() => navigate('/workorders?status=completed')}
            onKeyDown={handleKeyDown('/workorders?status=completed')}
            className="rounded-xl border p-4 cursor-pointer hover:bg-neutral-50"
          >
            <div className="text-sm opacity-70">Maintenance Compliance</div>
            <div className="text-2xl font-bold">{stats.maintenanceCompliance}%</div>
          </div>
          <div
            role="button"
            tabIndex={0}
            onClick={() => navigate('/inventory?lowStock=true')}
            onKeyDown={handleKeyDown('/inventory?lowStock=true')}
            className="rounded-xl border p-4 cursor-pointer hover:bg-neutral-50"
          >
            <div className="text-sm opacity-70">Inventory Alerts</div>
            <div className="text-2xl font-bold">{stats.inventoryAlerts}</div>
          </div>
        </div>

        {/* Status summaries with keyboard-accessible list items */}
        <div className="grid grid-cols-1 lg-grid-cols-2 lg:grid-cols-2 gap-6">
          <div className="rounded-xl border p-4">
            <h2 className="font-semibold mb-2">Work Orders by Status</h2>
            <ul className="space-y-1 text-sm">
              <li
                role="button"
                tabIndex={0}
                onClick={() => navigate('/workorders?status=open')}
                onKeyDown={handleKeyDown('/workorders?status=open')}
                className="cursor-pointer flex justify-between rounded p-1 hover:bg-neutral-50"
              >
                <span>Open:</span> <b>{workOrdersByStatus?.open ?? 0}</b>
              </li>
              <li
                role="button"
                tabIndex={0}
                onClick={() => navigate('/workorders?status=in-progress')}
                onKeyDown={handleKeyDown('/workorders?status=in-progress')}
                className="cursor-pointer flex justify-between rounded p-1 hover:bg-neutral-50"
              >
                <span>In Progress:</span> <b>{workOrdersByStatus?.inProgress ?? 0}</b>
              </li>
              <li
                role="button"
                tabIndex={0}
                onClick={() => navigate('/workorders?status=on-hold')}
                onKeyDown={handleKeyDown('/workorders?status=on-hold')}
                className="cursor-pointer flex justify-between rounded p-1 hover:bg-neutral-50"
              >
                <span>On Hold:</span> <b>{workOrdersByStatus?.onHold ?? 0}</b>
              </li>
              <li
                role="button"
                tabIndex={0}
                onClick={() => navigate('/workorders?status=completed')}
                onKeyDown={handleKeyDown('/workorders?status=completed')}
                className="cursor-pointer flex justify-between rounded p-1 hover:bg-neutral-50"
              >
                <span>Completed:</span> <b>{workOrdersByStatus?.completed ?? 0}</b>
              </li>
            </ul>
          </div>

          <div className="rounded-xl border p-4">
            <h2 className="font-semibold mb-2">Assets by Status</h2>
            <ul className="space-y-1 text-sm">
              <li
                role="button"
                tabIndex={0}
                onClick={() => navigate('/assets?status=Active')}
                onKeyDown={handleKeyDown('/assets?status=Active')}
                className="cursor-pointer flex justify-between rounded p-1 hover:bg-neutral-50"
              >
                <span>Active:</span> <b>{assetsByStatus?.Active ?? 0}</b>
              </li>
              <li
                role="button"
                tabIndex={0}
                onClick={() => navigate('/assets?status=Offline')}
                onKeyDown={handleKeyDown('/assets?status=Offline')}
                className="cursor-pointer flex justify-between rounded p-1 hover:bg-neutral-50"
              >
                <span>Offline:</span> <b>{assetsByStatus?.Offline ?? 0}</b>
              </li>
              <li
                role="button"
                tabIndex={0}
                onClick={() => navigate('/assets?status=In%20Repair')}
                onKeyDown={handleKeyDown('/assets?status=In%20Repair')}
                className="cursor-pointer flex justify-between rounded p-1 hover:bg-neutral-50"
              >
                <span>In Repair:</span> <b>{assetsByStatus?.['In Repair'] ?? 0}</b>
              </li>
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
