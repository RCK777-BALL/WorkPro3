import React, { useEffect, useState } from 'react';
import Layout from '../components/layout/Layout';
import { Download, Calendar, Filter } from 'lucide-react';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import http from '../lib/http';
import { useDashboardStore } from '../store/dashboardStore';
 // import { useAuth } from '../context/AuthContext';
 
import KpiWidget from '../components/kpi/KpiWidget';
import KpiExportButtons from '../components/kpi/KpiExportButtons';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

interface AnalyticsData {
  workOrderCompletionRate: number;
  averageResponseTime: number;
  maintenanceCompliance: number;
  assetUptime: number;
  costPerWorkOrder: number;
  laborUtilization: number;
  topAssets: { name: string; downtime: number; issues: number; cost: number }[];
}

interface KPIData {
  mttr: number;
  mtbf: number;
  backlog: number;
}

const Analytics: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [kpis, setKpis] = useState<KPIData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showFilters, setShowFilters] = useState(false);

  const { selectedRole: role, setSelectedRole } = useDashboardStore();
  const [costs, setCosts] = useState<any[]>([]);
  const [downtime, setDowntime] = useState<any[]>([]);


  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await http.get('/reports/analytics', { params: { role } });
      setData(res.data);
      const kpiRes = await http.get('/v1/analytics/kpis');
      setKpis(kpiRes.data);
      const costRes = await http.get('/reports/costs');
      setCosts(costRes.data);
      const downtimeRes = await http.get('/reports/downtime');
      setDowntime(downtimeRes.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchData();

  }, [role]);

  const handleRoleChange = (role: string) => {
    setSelectedRole(role);
  };
 
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading) {
    return (
      <Layout title="Analytics">
        <p>Loading...</p>
      </Layout>
    );
  }

  if (error || !data) {
    return (
      <Layout title="Analytics">
        <p className="text-red-600">{error || 'No data available'}</p>
      </Layout>
    );
  }

  return (
    <Layout title="Analytics">
      <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-neutral-900">Analytics</h2>
              <p className="text-neutral-500">Monitor performance metrics and trends</p>
            </div>
          <div className="flex flex-wrap items-center gap-2 sm:space-x-3">
            <select
              value={role ?? ''}
 
              onChange={(e) => handleRoleChange(e.target.value)}
 
              className="border border-neutral-300 rounded-md px-2 py-1 text-sm"
            >
              <option value="">All Roles</option>
              <option value="technician">Technician</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
            <Button
              variant="outline"
              icon={<Calendar size={16} />}
              onClick={() => {}}
            >
              Last 30 Days
            </Button>
            <Button
              variant="outline"
              icon={<Filter size={16} />}
              onClick={() => setShowFilters(!showFilters)}
            >
              Filters
            </Button>
            <Button
              variant="primary"
              icon={<Download size={16} />}
              onClick={() => {}}
            >
              Export Report
            </Button>
          </div>
        </div>

        {showFilters && (
          <Card className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-1">
                  Role
                </label>
                <select
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  value={role}
                  onChange={(e) => handleRoleChange(e.target.value)}
                >
                  <option value="all">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="technician">Technician</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
            </div>
          </Card>
        )}

        <div className="space-y-4">
          <KpiExportButtons />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <KpiWidget label="MTTR" value={kpis?.mttr.toFixed(1) ?? '0'} suffix="h" />
            <KpiWidget label="MTBF" value={kpis?.mtbf.toFixed(1) ?? '0'} suffix="h" />
            <KpiWidget label="Backlog" value={kpis?.backlog ?? 0} />
          </div>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium text-neutral-500">Work Order Completion Rate</h3>
                <Badge
                  text="+5.2%"
                  className="bg-success-100 text-success-700"
                />
              </div>
              <p className="text-2xl font-semibold">{data.workOrderCompletionRate.toFixed(1)}%</p>
              <div className="w-full bg-neutral-200 rounded-full h-1.5">
                <div
                  className="bg-success-500 h-1.5 rounded-full"
                  style={{ width: `${data.workOrderCompletionRate}%` }}
                />
              </div>
            </div>
          </Card>

          <Card>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium text-neutral-500">Average Response Time</h3>
                <Badge 
                  text="-0.3h" 
                  className="bg-success-100 text-success-700"
                />
              </div>
              <p className="text-2xl font-semibold">{data.averageResponseTime.toFixed(1)}h</p>
              <div className="w-full bg-neutral-200 rounded-full h-1.5">
                <div 
                  className="bg-primary-500 h-1.5 rounded-full" 
                  style={{ width: '80%' }}
                />
              </div>
            </div>
          </Card>

          <Card>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium text-neutral-500">Maintenance Compliance</h3>
                <Badge 
                  text="+2.1%" 
                  className="bg-success-100 text-success-700"
                />
              </div>
              <p className="text-2xl font-semibold">{data.maintenanceCompliance.toFixed(1)}%</p>
              <div className="w-full bg-neutral-200 rounded-full h-1.5">
                <div 
                  className="bg-success-500 h-1.5 rounded-full" 
                  style={{ width: `${data.maintenanceCompliance}%` }}
                />
              </div>
            </div>
          </Card>

          <Card>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium text-neutral-500">Asset Uptime</h3>
                <Badge 
                  text="+0.8%" 
                  className="bg-success-100 text-success-700"
                />
              </div>
              <p className="text-2xl font-semibold">{data.assetUptime.toFixed(1)}%</p>
              <div className="w-full bg-neutral-200 rounded-full h-1.5">
                <div 
                  className="bg-success-500 h-1.5 rounded-full" 
                  style={{ width: `${data.assetUptime}%` }}
                />
              </div>
            </div>
          </Card>

          <Card>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium text-neutral-500">Cost per Work Order</h3>
                <Badge 
                  text="-$12.30" 
                  className="bg-success-100 text-success-700"
                />
              </div>
              <p className="text-2xl font-semibold">{formatCurrency(data.costPerWorkOrder)}</p>
              <div className="w-full bg-neutral-200 rounded-full h-1.5">
                <div 
                  className="bg-primary-500 h-1.5 rounded-full" 
                  style={{ width: '75%' }}
                />
              </div>
            </div>
          </Card>

          <Card>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium text-neutral-500">Labor Utilization</h3>
                <Badge 
                  text="+3.5%" 
                  className="bg-success-100 text-success-700"
                />
              </div>
              <p className="text-2xl font-semibold">{data.laborUtilization.toFixed(1)}%</p>
              <div className="w-full bg-neutral-200 rounded-full h-1.5">
                <div 
                  className="bg-success-500 h-1.5 rounded-full" 
                  style={{ width: `${data.laborUtilization}%` }}
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Cost and Downtime Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Monthly Costs">
            <Line
              data={{
                labels: costs.map((c) => c.period),
                datasets: [
                  {
                    label: 'Labor',
                    data: costs.map((c) => c.laborCost),
                    borderColor: '#3b82f6',
                  },
                  {
                    label: 'Materials',
                    data: costs.map((c) => c.materialCost),
                    borderColor: '#10b981',
                  },
                  {
                    label: 'Maintenance',
                    data: costs.map((c) => c.maintenanceCost),
                    borderColor: '#f59e0b',
                  },
                ],
              }}
              data-testid="cost-chart"
            />
          </Card>
          <Card title="Asset Downtime">
            <Line
              data={{
                labels: downtime.map((d) => d.period),
                datasets: [
                  {
                    label: 'Downtime (h)',
                    data: downtime.map((d) => d.downtime),
                    borderColor: '#ef4444',
                  },
                ],
              }}
              data-testid="downtime-chart"
            />
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card
            title="Work Orders by Priority"
            subtitle="Distribution of work orders by priority level"
          >
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">Critical</span>
                  <span className="text-sm font-medium">15%</span>
                </div>
                <div className="w-full bg-neutral-200 rounded-full h-2">
                  <div className="bg-error-500 h-2 rounded-full" style={{ width: '15%' }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">High</span>
                  <span className="text-sm font-medium">25%</span>
                </div>
                <div className="w-full bg-neutral-200 rounded-full h-2">
                  <div className="bg-warning-500 h-2 rounded-full" style={{ width: '25%' }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">Medium</span>
                  <span className="text-sm font-medium">40%</span>
                </div>
                <div className="w-full bg-neutral-200 rounded-full h-2">
                  <div className="bg-primary-500 h-2 rounded-full" style={{ width: '40%' }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">Low</span>
                  <span className="text-sm font-medium">20%</span>
                </div>
                <div className="w-full bg-neutral-200 rounded-full h-2">
                  <div className="bg-success-500 h-2 rounded-full" style={{ width: '20%' }}></div>
                </div>
              </div>
            </div>
          </Card>

          <Card
            title="Maintenance Types"
            subtitle="Distribution of maintenance activities"
          >
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">Preventive</span>
                  <span className="text-sm font-medium">45%</span>
                </div>
                <div className="w-full bg-neutral-200 rounded-full h-2">
                  <div className="bg-success-500 h-2 rounded-full" style={{ width: '45%' }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">Corrective</span>
                  <span className="text-sm font-medium">30%</span>
                </div>
                <div className="w-full bg-neutral-200 rounded-full h-2">
                  <div className="bg-warning-500 h-2 rounded-full" style={{ width: '30%' }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">Predictive</span>
                  <span className="text-sm font-medium">15%</span>
                </div>
                <div className="w-full bg-neutral-200 rounded-full h-2">
                  <div className="bg-primary-500 h-2 rounded-full" style={{ width: '15%' }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">Condition-based</span>
                  <span className="text-sm font-medium">10%</span>
                </div>
                <div className="w-full bg-neutral-200 rounded-full h-2">
                  <div className="bg-teal-500 h-2 rounded-full" style={{ width: '10%' }}></div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Asset Performance */}
        <Card
          title="Asset Performance"
          subtitle="Top assets by downtime and maintenance cost"
        >
          <div className="space-y-6">
            {data.topAssets.map((asset, index) => (
              <div key={index} className="p-4 bg-neutral-50 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium text-neutral-900">{asset.name}</h4>
                    <div className="mt-2 grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-neutral-500">Downtime</p>
                        <p className="text-lg font-medium">{asset.downtime}h</p>
                      </div>
                      <div>
                        <p className="text-sm text-neutral-500">Issues</p>
                        <p className="text-lg font-medium">{asset.issues}</p>
                      </div>
                      <div>
                        <p className="text-sm text-neutral-500">Cost</p>
                        <p className="text-lg font-medium">{formatCurrency(asset.cost)}</p>
                      </div>
                    </div>
                  </div>
                  <Badge
                    text={index === 0 ? 'High Risk' : 'Moderate Risk'}
                    className={index === 0 ? 'bg-error-100 text-error-700' : 'bg-warning-100 text-warning-700'}
                  />
                </div>
                <div className="mt-4">
                  <div className="w-full bg-neutral-200 rounded-full h-1.5">
                    <div 
                      className={`h-1.5 rounded-full ${
                        index === 0 ? 'bg-error-500' : 'bg-warning-500'
                      }`}
                      style={{ width: `${85 - index * 15}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default Analytics;
