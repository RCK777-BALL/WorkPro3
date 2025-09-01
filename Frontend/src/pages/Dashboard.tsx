import React, { useEffect, useState } from 'react';
import Layout from '../components/layout/Layout';
import { useAuthStore } from '../store/authStore';
import { useDashboardStore } from '../store/dashboardStore';
import { useSocketStore } from '../store/socketStore';
import useDashboardData from '../hooks/useDashboardData';
import { useSummary } from '../hooks/useSummaryData';
import api from '../utils/api';
import { getChatSocket } from '../utils/chatSocket';
import { Responsive, WidthProvider, type Layouts } from 'react-grid-layout';
import DashboardStats from '../components/dashboard/DashboardStats';
import WorkOrdersChart from '../components/dashboard/WorkOrdersChart';
import UpcomingMaintenance from '../components/dashboard/UpcomingMaintenance';

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

const ResponsiveGridLayout = WidthProvider(Responsive);

const defaultLayouts: Layouts = {
  lg: [
    { i: 'stats', x: 0, y: 0, w: 12, h: 4 },
    { i: 'workOrders', x: 0, y: 4, w: 6, h: 8 },
    { i: 'maintenance', x: 6, y: 4, w: 6, h: 8 },
  ],
  md: [
    { i: 'stats', x: 0, y: 0, w: 10, h: 4 },
    { i: 'workOrders', x: 0, y: 4, w: 10, h: 8 },
    { i: 'maintenance', x: 0, y: 12, w: 10, h: 8 },
  ],
  sm: [
    { i: 'stats', x: 0, y: 0, w: 6, h: 4 },
    { i: 'workOrders', x: 0, y: 4, w: 6, h: 8 },
    { i: 'maintenance', x: 0, y: 12, w: 6, h: 8 },
  ],
};

const Dashboard: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const {
    selectedRole,
    selectedDepartment,
    setSelectedDepartment,
    layouts,
    setLayouts,
  } = useDashboardStore();
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
  const [showFilters, setShowFilters] = useState(false);
  const [customize, setCustomize] = useState(false);

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

  // restore saved layout
  useEffect(() => {
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('dashboardLayoutV1') : null;
      if (stored) {
        setLayouts(JSON.parse(stored));
      } else {
        setLayouts(defaultLayouts);
      }
    } catch {
      setLayouts(defaultLayouts);
    }
  }, [setLayouts]);

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

  const handleLayoutChange = (_: any, allLayouts: Layouts) => {
    setLayouts(allLayouts);
  };

  return (
    <Layout title="Dashboard">
      <div className="px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Welcome{user?.name ? `, ${user.name}` : ''}</h1>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setShowFilters((s) => !s)}
              className="px-3 py-1 text-sm border rounded-md"
            >
              Filters
            </button>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={customize}
                onChange={() => setCustomize((c) => !c)}
              />
              Customize layout
            </label>
            {loading && <span className="text-sm opacity-70">Refreshing…</span>}
          </div>
        </div>

        {showFilters && (
          <div>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="mt-2 p-2 border rounded-md"
            >
              <option value="all">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <ResponsiveGridLayout
          className="layout"
          layouts={Object.keys(layouts).length ? layouts : defaultLayouts}
          cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
          rowHeight={30}
          isDraggable={customize}
          isResizable={customize}
          onLayoutChange={handleLayoutChange}
        >
          <div key="stats" className="h-full">
            <DashboardStats stats={stats} />
          </div>
          <div key="workOrders" className="h-full">
            <WorkOrdersChart data={workOrdersByStatus} />
          </div>
          <div key="maintenance" className="h-full">
            <UpcomingMaintenance maintenanceItems={upcomingMaintenance} />
          </div>
        </ResponsiveGridLayout>
      </div>
    </Layout>
  );
};

export default Dashboard;
