/*
 * SPDX-License-Identifier: MIT
 */

import React, { useEffect, useMemo, useState } from 'react';
import FiltersBar from '@/components/dashboard/FiltersBar';
import DashboardStats from '@/components/dashboard/DashboardStats';
import WorkOrdersChart from '@/components/dashboard/WorkOrdersChart';
import AssetsStatusChart from '@/components/dashboard/AssetsStatusChart';
import UpcomingMaintenance from '@/components/dashboard/UpcomingMaintenance';
import CriticalAlerts from '@/components/dashboard/CriticalAlerts';
import LowStockParts from '@/components/dashboard/LowStockParts';
import { useDashboardStore } from '@/store/dashboardStore';
import useDashboardData from '@/hooks/useDashboardData';
import { useSummary } from '@/hooks/useSummaryData';
import http from '@/lib/http';
import type {
  Department,
  DashboardSummary,
  LowStockPart,
  LowStockPartResponse,
} from '@/types';

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

  const [departments, setDepartments] = useState<Department[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (selectedRole && selectedRole !== 'all') params.append('role', selectedRole);
    if (selectedDepartment && selectedDepartment !== 'all')
      params.append('department', selectedDepartment);
    if (selectedTimeframe) {
      params.append('timeframe', selectedTimeframe);
      if (selectedTimeframe === 'custom') {
        params.append('start', customRange.start);
        params.append('end', customRange.end);
      }
    }
    const qs = params.toString();
    return qs ? `?${qs}` : '';
  }, [selectedRole, selectedDepartment, selectedTimeframe, customRange]);

  const [summary] = useSummary<DashboardSummary>(`/summary${query}`, [query]);
  const [lowStockRaw] = useSummary<LowStockPartResponse[]>(
    `/summary/low-stock${query}`,
    [query],
  );

  const lowStock: LowStockPart[] = useMemo(
    () =>
      (lowStockRaw || []).map((p) => ({
        id: p._id ?? p.id ?? '',
        name: p.name,
        quantity: p.quantity,
        reorderPoint: p.reorderPoint ?? p.reorderThreshold ?? 0,
      })),
    [lowStockRaw],
  );

  useEffect(() => {
    http
      .get<Department[]>('/summary/departments')
      .then((res) => setDepartments(res.data))
      .catch(() => setDepartments([]));
  }, []);

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
            Live operational key performance indicators
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

