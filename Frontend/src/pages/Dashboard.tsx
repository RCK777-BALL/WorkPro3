import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import Layout from '../components/layout/Layout';
import { useAuthStore } from '../store/authStore';
import { useDashboardStore } from '../store/dashboardStore';
import { useNavigate } from 'react-router-dom';

import WorkOrdersChart from '../components/dashboard/WorkOrdersChart';
import UpcomingMaintenance from '../components/dashboard/UpcomingMaintenance';
import DashboardCard from '../components/dashboard/DashboardCard';
import { ErrorBoundary } from 'react-error-boundary';
import ErrorFallback from '../components/common/ErrorFallback';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import { AlertTriangle, ArrowRight, BarChart3, Clock, Filter, Calendar } from 'lucide-react';
 
import api from '../utils/api';
import useDashboardData from '../hooks/useDashboardData';
import { useSummary } from '../hooks/useSummaryData';
 import { getChatSocket } from '../utils/chatSocket';
 
import type {
  Department,
  DashboardSummary,
  LowStockPart,
  LowStockPartResponse,
  AnalyticsData,
  DashboardStats,
} from '../types';
import { useSocketStore } from '../store/socketStore';


// Utility function to format time ago
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
  const navigate = useNavigate();
 
  const connected = useSocketStore((s) => s.connected);
  const {
    selectedTimeframe,
    setSelectedTimeframe,
    selectedDepartment,
    setSelectedDepartment,
    selectedRole,
    setSelectedRole,
    dateRange,
    setDateRange,
    role,
    setRole,
  } = useDashboardStore();
  const [showFilters, setShowFilters] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const {
    workOrdersByStatus,
    assetsByStatus,
    upcomingMaintenance,
    criticalAlerts,
    refresh,
    loading,
  } = useDashboardData(selectedRole);
  const [stats, setStats] = useState<DashboardStats>({
    totalAssets: 0,
    activeWorkOrders: 0,
    maintenanceCompliance: 0,
    inventoryAlerts: 0,
  });
  const [lowStockParts, setLowStockParts] = useState<LowStockPart[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [summary] = useSummary<DashboardSummary>(
    `/summary${selectedRole ? `?role=${selectedRole}` : ''}`,
    [selectedRole],
  );
  const [lowStock] = useSummary<LowStockPartResponse[]>(
    `/summary/low-stock${selectedRole ? `?role=${selectedRole}` : ''}`,
    [selectedRole],
  );
  const [departmentsData] = useSummary<Department[]>(
    '/departments',
    [],
    { ttlMs: 60_000 },
  );

  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);


  useEffect(() => {
    if (user?.role) {
      setRole(user.role);
      setSelectedRole(user.role);
    }
  }, [user, setRole, setSelectedRole]);

  useEffect(() => {
    if (departmentsData) setDepartments(departmentsData);
  }, [departmentsData]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const query = role ? `?role=${role}` : '';
        const res = await api.get<AnalyticsData>(`/reports/analytics${query}`);
        setAnalytics(res.data);
      } catch (err) {
        console.error('Error fetching analytics', err);
      }
    };
    fetchAnalytics();
  }, [role]);

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
          ? Math.round(
              (summary.completedWorkOrders / summary.totalWorkOrders) * 100,
            )
          : 0,
      inventoryAlerts: mapped.length,
    });
  }, [summary, lowStock]);

  useEffect(() => {
    const s = getChatSocket();

    const refreshAlerts = async () => {
      try {
        await refresh();
      } catch (err) {
        console.error('Failed to update critical alerts', err);
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
      setStats((s) => ({ ...s, inventoryAlerts: mapped.length }));
    };

    const handlePmCompletionUpdate = (data: any) => {
      const value =
        typeof data === 'number'
          ? data
          : typeof data?.maintenanceCompliance === 'number'
          ? data.maintenanceCompliance
          : 0;
      setStats((s) => ({ ...s, maintenanceCompliance: value }));
    };

    s.on('inventoryUpdated', refreshAlerts);
    s.on('workOrderUpdated', refreshAlerts);
    s.on('lowStockUpdated', handleLowStockUpdate);
    s.on('pmCompletionUpdated', handlePmCompletionUpdate);

    return () => {
      s.off('inventoryUpdated', refreshAlerts);
      s.off('workOrderUpdated', refreshAlerts);
      s.off('lowStockUpdated', handleLowStockUpdate);
      s.off('pmCompletionUpdated', handlePmCompletionUpdate);
    };
  }, [refresh]);


  const assetValues = Object.values(assetsByStatus || {});
  const totalAssetsCount = assetValues.reduce((sum, c) => sum + c, 0);
  const facilityUptime = totalAssetsCount
    ? ((assetsByStatus['Active'] / totalAssetsCount) * 100).toFixed(1)
    : '0';

  const handleTimeframeChange = (timeframe: 'day' | 'week' | 'month') => {
    setSelectedTimeframe(timeframe);
    refresh();
  };

  const handleDepartmentChange = (department: string) => {
    setSelectedDepartment(department);
    refresh();
  };

  const handleRoleChange = (role: string) => {
    setSelectedRole(role);
  };

  const handleDateRangeChange = (start: string, end: string) => {
    setDateRange({ start, end });
    refresh();
  };


  const handleAlertClick = (alertId: string) => {
    const alert = criticalAlerts.find((a) => a.id === alertId);
    if (alert) {
      if (alert.severity === 'critical') {
        navigate(`/assets/${alert.assetName.toLowerCase().replace(/\s+/g, '-')}`);
      } else {
        navigate('/maintenance');
      }
    }
  };

  const handleInventoryAlertClick = () => {
    navigate('/inventory');
  };

  const metricCards = [
    { title: 'Total Assets', value: stats.totalAssets, linkTo: '/assets' },
    { title: 'Work Orders', value: stats.activeWorkOrders, linkTo: '/work-orders' },
    {
      title: 'PM Compliance',
      value: `${stats.maintenanceCompliance}%`,
      linkTo: '/analytics',
    },
    { title: 'Inventory Alerts', value: stats.inventoryAlerts, linkTo: '/inventory' },
  ];

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Layout title="Dashboard">
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">Welcome back, {user?.name}</h2>
              <p className="text-neutral-500 dark:text-neutral-400">Here's what's happening with your maintenance operations today.</p>
              <Badge
                text={connected ? 'Connected' : 'Disconnected'}
                size="sm"
                className={`${connected ? 'bg-success-100 text-success-700 dark:bg-success-900 dark:text-success-200' : 'bg-error-100 text-error-700 dark:bg-error-900 dark:text-error-200'} mt-1 inline-block`}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:space-x-3">
              <div className="flex bg-white dark:bg-neutral-800 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-700">
                <button
                  onClick={() => handleTimeframeChange('day')}
                  className={`px-4 py-2 text-sm font-medium rounded-l-lg transition-colors ${selectedTimeframe === 'day'
                      ? 'bg-primary-100 dark:bg-primary-900 text-primary-900 dark:text-primary-100'
                      : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-700'
                    }`}
                >
                  Day
                </button>
                <button
                  onClick={() => handleTimeframeChange('week')}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${selectedTimeframe === 'week'
                      ? 'bg-primary-100 dark:bg-primary-900 text-primary-900 dark:text-primary-100'
                      : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-700'
                    }`}
                >
                  Week
                </button>
                <button
                  onClick={() => handleTimeframeChange('month')}
                  className={`px-4 py-2 text-sm font-medium rounded-r-lg transition-colors ${selectedTimeframe === 'month'
                      ? 'bg-primary-100 dark:bg-primary-900 text-primary-900 dark:text-primary-100'
                      : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-700'
                    }`}
                >
                  Month
                </button>
              </div>

              <Button
                variant="outline"
                icon={<Calendar size={16} />}
                onClick={() => setShowDatePicker(!showDatePicker)}
              >
                Custom Range
              </Button>

              <Button
                variant="outline"
                icon={<Filter size={16} />}
                onClick={() => setShowFilters(!showFilters)}
              >
                Filters
              </Button>
            </div>
          </div>

          {showDatePicker && (
            <Card className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => handleDateRangeChange(e.target.value, dateRange.end)}
                    className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => handleDateRangeChange(dateRange.start, e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  />
                </div>
              </div>
            </Card>
          )}

          {showFilters && (
            <Card className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-1">
                    Role
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                    value={selectedRole}
                    onChange={(e) => handleRoleChange(e.target.value)}
                  >
                    <option value="all">All Roles</option>
                    <option value="admin">Admin</option>
                    <option value="manager">Manager</option>
                    <option value="technician">Technician</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-1">
                    Department
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                    value={selectedDepartment}
                    onChange={(e) => handleDepartmentChange(e.target.value)}
                  >
                    <option value="all">All Departments</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-1">
                    Status
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  >
                    <option value="all">All Statuses</option>
                    <option value="Active">Active</option>
                    <option value="Offline">Offline</option>
                    <option value="In Repair">In Repair</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-1">
                    Priority
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  >
                    <option value="all">All Priorities</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>
            </Card>
          )}


          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="h-[120px] rounded-lg bg-neutral-200 dark:bg-neutral-700 animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {metricCards.map((card) => (
                <DashboardCard key={card.title} {...card} />
              ))}
            </div>
          )}

          <div className="mt-6">
            <div className="flex justify-end mb-2">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="border border-neutral-300 rounded-md px-2 py-1 text-sm"
              >
                <option value="">All Roles</option>
                <option value="technician">Technician</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            {analytics && (
              <Card title="Labor Utilization">
                <p className="text-2xl font-semibold">
                  {analytics.laborUtilization.toFixed(1)}%
                </p>
              </Card>
            )}
          </div>

          <Card title="Quick Actions">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="primary"
                onClick={() => navigate('/work-orders/create')}
              >
                Create Work Order
              </Button>
              <Button
                variant="primary"
                onClick={() => navigate('/inventory/add')}
              >
                Add Inventory Part
              </Button>
              <Button
                variant="primary"
                onClick={() => navigate('/timesheets')}
              >
                Timesheets
              </Button>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <div key="workOrders">
              <motion.div layout transition={{ duration: 0.3 }}>
                <WorkOrdersChart data={workOrdersByStatus} />
              </motion.div>
            </div>

            <div key="assetPerformance">
              <motion.div layout transition={{ duration: 0.3 }}>
                <Card
                  title="Asset Performance"
                  subtitle="Assets by status"
                  headerActions={
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<BarChart3 size={16} />}
                      onClick={() => navigate('/analytics')}
                    >
                      Details
                    </Button>
                  }
                >
                  <div className="space-y-4">
                    {Object.entries(assetsByStatus || {}).map(([status, count]) => {
                      const percentage = totalAssetsCount
                        ? ((count / totalAssetsCount) * 100).toFixed(1)
                        : '0';
                      const colorMap: Record<string, string> = {
                        Active: 'bg-success-500',
                        Offline: 'bg-error-500',
                        'In Repair': 'bg-warning-500',
                      };
                      return (
                        <div key={status}>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium text-neutral-900 dark:text-white">
                              {status}
                            </span>
                            <span className="text-sm font-medium text-neutral-900 dark:text-white">
                              {percentage}%
                            </span>
                          </div>
                          <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
                            <div
                              className={`${colorMap[status]} h-2 rounded-full`}
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-6 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">Facility-Wide Uptime</p>
                        <p className="text-xl font-semibold text-neutral-900 dark:text-white">{facilityUptime}%</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        icon={<ArrowRight size={16} />}
                        iconPosition="right"
                        onClick={() => navigate('/assets')}
                      >
                        View All Assets
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            </div>

            <div key="upcoming">
              <motion.div layout transition={{ duration: 0.3 }}>
                {loading ? (
                  <Card title="Upcoming Maintenance" subtitle="Next scheduled maintenance activities">
                    <div className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <div
                          key={i}
                          className="h-20 rounded-lg bg-neutral-200 dark:bg-neutral-700 animate-pulse"
                        />
                      ))}
                    </div>
                  </Card>
                ) : (
                  <UpcomingMaintenance maintenanceItems={upcomingMaintenance} />
                )}
              </motion.div>
            </div>

            <div key="critical">
              <motion.div layout transition={{ duration: 0.3 }}>
                {loading ? (
                  <Card title="Critical Alerts" subtitle="Issues requiring immediate attention">
                    <div className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <div
                          key={i}
                          className="h-16 rounded-lg bg-neutral-200 dark:bg-neutral-700 animate-pulse"
                        />
                      ))}
                    </div>
                  </Card>
                ) : (
                  <Card
                    title="Critical Alerts"
                    subtitle="Issues requiring immediate attention"
                    headerActions={
                      <Button
                        variant="outline"
                        size="sm"
                        icon={<AlertTriangle size={16} />}
                      >
                        {criticalAlerts.length}
                      </Button>
                    }
                  >
                    <div className="space-y-4">
                      {criticalAlerts.map((alert) => (
                        <button
                          key={alert.id}
                          onClick={() => handleAlertClick(alert.id)}
                          className={`
                      w-full text-left p-4 rounded-lg border transition-colors duration-150
                      hover:bg-neutral-50 dark:hover:bg-neutral-800
                      ${alert.severity === 'critical'
                            ? 'bg-error-50 dark:bg-error-900/20 border-error-200 dark:border-error-800'
                            : 'bg-warning-50 dark:bg-warning-900/20 border-warning-200 dark:border-warning-800'}
                    `}
                        >
                          <div className="flex justify-between">
                            <h4 className="font-medium text-neutral-900 dark:text-white">{alert.assetName}</h4>
                            <Badge
                              text={alert.severity}
                              size="sm"
                              className={alert.severity === 'critical'
                                ? 'bg-error-100 dark:bg-error-900 text-error-700 dark:text-error-200'
                                : 'bg-warning-100 dark:bg-warning-900 text-warning-700 dark:text-warning-200'}
                            />
                          </div>
                          <p className="text-sm mt-1 text-neutral-700 dark:text-neutral-300">{alert.issue}</p>
                          <div className="flex items-center mt-3 text-sm text-neutral-500 dark:text-neutral-400">
                            <Clock size={14} className="mr-1" />
                            <span>{getTimeAgo(alert.timestamp)}</span>
                          </div>
                        </button>
                      ))}

                      {criticalAlerts.length === 0 && (
                        <div className="py-10 text-center">
                          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success-100 dark:bg-success-900 mb-4">
                            <svg className="h-8 w-8 text-success-600 dark:text-success-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <p className="text-success-700 dark:text-success-400 font-medium">No critical alerts at this time</p>
                        </div>
                      )}
                    </div>
                  </Card>
                )}
              </motion.div>
            </div>

            <div key="lowStock">
              <motion.div layout transition={{ duration: 0.3 }}>
                <Card
                  title="Parts Low in Stock"
                  subtitle="Inventory items below reorder point"
                >
                  <div className="space-y-3">
                    {lowStockParts.map((part) => {
                      const ratio = part.reorderPoint
                        ? (part.quantity / part.reorderPoint) * 100
                        : 0;
                      const level =
                        part.reorderPoint && part.quantity / part.reorderPoint <= 0.25
                          ? 'Critical'
                          : 'Low';
                      const badgeClass =
                        level === 'Critical'
                          ? 'bg-error-100 dark:bg-error-900 text-error-700 dark:text-error-200'
                          : 'bg-warning-100 dark:bg-warning-900 text-warning-700 dark:text-warning-200';
                      const qtyClass =
                        level === 'Critical'
                          ? 'text-error-600 dark:text-error-400'
                          : 'text-warning-700 dark:text-warning-400';
                      const barColor =
                        level === 'Critical' ? 'bg-error-500' : 'bg-warning-500';

                      return (
                        <button
                          key={part.id}
                          onClick={handleInventoryAlertClick}
                          className="w-full text-left p-3 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors duration-150"
                        >
                          <div className="flex justify-between">
                            <h4 className="font-medium text-neutral-900 dark:text-white">{part.name}</h4>
                            <Badge text={level} size="sm" className={badgeClass} />
                          </div>
                          <div className="mt-2 flex justify-between text-sm">
                            <span className="text-neutral-500 dark:text-neutral-400">
                              Current Stock: <strong className={qtyClass}>{part.quantity}</strong>
                            </span>
                            <span className="text-neutral-500 dark:text-neutral-400">
                              Reorder Point: <strong>{part.reorderPoint}</strong>
                            </span>
                          </div>
                          <div className="mt-3">
                            <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-1.5">
                              <div
                                className={`${barColor} h-1.5 rounded-full`}
                                style={{ width: `${Math.min(100, ratio)}%` }}
                              ></div>
                            </div>
                          </div>
                        </button>
                      );
                    })}

                    {lowStockParts.length === 0 && (
                      <div className="py-10 text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success-100 dark:bg-success-900 mb-4">
                          <svg className="h-8 w-8 text-success-600 dark:text-success-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <p className="text-success-700 dark:text-success-400 font-medium">No parts below threshold</p>
                      </div>
                    )}
                  </div>

 
                <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                  <Button
                    variant="outline"
                    size="sm"
                    fullWidth
                    onClick={() => navigate('/inventory')}
                  >
                    Manage Inventory
                  </Button>
                </div>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </Layout>
    </ErrorBoundary>
  );
 
};

export default Dashboard;

