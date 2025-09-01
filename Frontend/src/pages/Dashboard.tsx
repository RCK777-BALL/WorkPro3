import React, { useEffect, useRef, useState } from 'react';
import Layout from '../components/layout/Layout';
import Button from '../components/common/Button';
import { Download, Upload } from 'lucide-react';
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

// (optional helper; safe to remove if unused elsewhere)
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
    selectedTimeframe,
    customRange,
    setSelectedDepartment,
    layouts,
    setLayouts,
  } = useDashboardStore((s) => ({
    selectedRole: s.selectedRole,
    selectedDepartment: s.selectedDepartment,
    selectedTimeframe: s.selectedTimeframe,
    customRange: s.customRange,
    setSelectedDepartment: s.setSelectedDepartment,
    layouts: s.layouts,
    setLayouts: s.setLayouts,
  }));
  const connected = useSocketStore((s) => s.connected);

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
  const [analytics, setAnalytics] = useState<any | null>(null);
  const [customize, setCustomize] = useState(false);
  const dashboardRef = useRef<HTMLDivElement>(null);

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

  // restore saved layout (once)
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
        const res = await api.get(`/reports/analytics${buildQuery()}`);
        setAnalytics(res.data);
      } catch (err) {
        console.error('Error fetching analytics', err);
      }
    };
    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDepartment, selectedRole, selectedTimeframe, customRange]);

  // socket-driven refresh with polling fallback
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

  const handleLayoutChange = (_: any, allLayouts: Layouts) => {
    setLayouts(allLayouts);
    try {
      localStorage.setItem('dashboardLayoutV1', JSON.stringify(allLayouts));
    } catch {
      // ignore persistence errors
    }
  };

  const handleExportCSV = async () => {
    const { default: exportCsv } = await import('../utils/exportCsv');
    exportCsv(
      {
        'Total Assets': stats.totalAssets,
        'Active Work Orders': stats.activeWorkOrders,
        'Maintenance Compliance': stats.maintenanceCompliance,
        'Inventory Alerts': stats.inventoryAlerts,
      },
      'dashboard-kpis',
    );
    exportCsv(lowStockParts, 'dashboard-low-stock');
  };

  const handleExportPDF = async () => {
    if (!dashboardRef.current) return;
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ]);
    const canvas = await html2canvas(dashboardRef.current, {
      ignoreElements: (el) => el.classList.contains('no-export'),
    });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const width = pdf.internal.pageSize.getWidth();
    const height = (canvas.height * width) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, width, height);
    pdf.save('dashboard-summary.pdf');
  };

  return (
    <Layout title="Dashboard">
      <div className="px-4 py-6 space-y-6" ref={dashboardRef}>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Welcome{user?.name ? `, ${user.name}` : ''}</h1>
          <div className="flex items-center gap-4 no-export">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={customize}
                onChange={() => setCustomize((c) => !c)}
              />
              Customize layout
            </label>
            {loading && <span className="text-sm opacity-70">Refreshing…</span>}
            <button
              className="text-sm border px-2 py-1 rounded"
              onClick={() => setLiveData((v) => !v)}
            >
              {liveData ? 'Live On' : 'Live Off'}
            </button>
            <Button variant="outline" icon={<Download size={16} />} onClick={handleExportCSV}>
              Export CSV
            </Button>
            <Button variant="outline" icon={<Upload size={16} />} onClick={handleExportPDF}>
              Export PDF
            </Button>
          </div>
        </div>

        <FiltersBar departments={departments} />

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
