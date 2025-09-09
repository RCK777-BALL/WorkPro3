import React, { useEffect, useState } from 'react';
import FiltersBar from '../components/dashboard/FiltersBar';
import DashboardStats from '../components/dashboard/DashboardStats';
import WorkOrdersChart from '../components/dashboard/WorkOrdersChart';
import AssetsStatusChart from '../components/dashboard/AssetsStatusChart';
import UpcomingMaintenance from '../components/dashboard/UpcomingMaintenance';
import CriticalAlerts from '../components/dashboard/CriticalAlerts';
import LowStockParts from '../components/dashboard/LowStockParts';
import { useDashboardStore } from '../store/dashboardStore';
import useDashboardData from '../hooks/useDashboardData';
import { fetchSummary, fetchLowStock } from '../api/summary';
import http from '../lib/http';
import type {
  Department,
  DashboardSummary,
  LowStockPart,
} from '../types';

export default function Dashboard() {
  const {
    selectedRole,
    selectedDepartment,
    selectedTimeframe,
    customRange,
  } = useDashboardStore();

  const {
    workOrdersByStatus,
    assetsByStatus,
    upcomingMaintenance,
    criticalAlerts,
  } = useDashboardData(
    selectedRole,
    selectedDepartment,
    selectedTimeframe,
    customRange,
  );

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [lowStock, setLowStock] = useState<LowStockPart[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    http
      .get<Department[]>('/summary/departments')
      .then((res) => setDepartments(res.data))
      .catch(() => setDepartments([]));
  }, []);

  useEffect(() => {
    const params: Record<string, string> = {};
    if (selectedRole && selectedRole !== 'all') params.role = selectedRole;
    if (selectedDepartment && selectedDepartment !== 'all')
      params.department = selectedDepartment;
    if (selectedTimeframe) {
      params.timeframe = selectedTimeframe;
      if (selectedTimeframe === 'custom') {
        params.start = customRange.start;
        params.end = customRange.end;
      }
    }

    fetchSummary(params)
      .then(setSummary)
      .catch(() => setSummary(null));

    fetchLowStock(params)
      .then((data) =>
        setLowStock(
          data.map((p) => ({
            id: p._id ?? p.id ?? '',
            name: p.name,
            quantity: p.quantity,
            reorderPoint: p.reorderPoint ?? p.reorderThreshold ?? 0,
          }))
        )
      )
      .catch(() => setLowStock([]));
  }, [selectedRole, selectedDepartment, selectedTimeframe, customRange]);

  const stats = {
    totalAssets: summary?.totalAssets ?? 0,
    activeWorkOrders: summary?.activeWorkOrders ?? 0,
    maintenanceCompliance: summary
      ? Math.max(0, 100 - summary.overduePmTasks)
      : 100,
    inventoryAlerts: lowStock.length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            Overview of key performance indicators
          </p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="px-3 py-2 text-sm border rounded-md"
        >
          Filters
        </button>
      </div>

      {showFilters && <FiltersBar departments={departments} />}

      <DashboardStats stats={stats} />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <WorkOrdersChart data={workOrdersByStatus} />
        <AssetsStatusChart data={assetsByStatus} />
        <LowStockParts parts={lowStock} />
        <UpcomingMaintenance maintenanceItems={upcomingMaintenance} />
        <CriticalAlerts alerts={criticalAlerts} />
      </div>
    </div>
  );
}

