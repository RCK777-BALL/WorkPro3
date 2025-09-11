/*
 * SPDX-License-Identifier: MIT
 */

import React, { useEffect, useState } from 'react';
import Card from '../components/common/Card';
import KpiWidget from '../components/kpi/KpiWidget';
import KpiExportButtons from '../components/kpi/KpiExportButtons';
import http from '../lib/http';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

interface KPIData {
  mttr: number;
  mtbf: number;
  backlog: number;
}

interface AnalyticsData {
  maintenanceCompliance: number;
}

interface TrendData {
  period: string;
  maintenanceCost: number;
  assetDowntime: number;
}

export default function Reports() {
  const [kpis, setKpis] = useState<{ mtbf: number; mttr: number; compliance: number } | null>(null);
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [kpiRes, analyticsRes, trendRes] = await Promise.all([
          http.get<KPIData>('/v1/analytics/kpis'),
          http.get<AnalyticsData>('/v1/analytics/analytics'),
          http.get<TrendData[]>('/v1/analytics/trends'),
        ]);
        setKpis({
          mtbf: kpiRes.data.mtbf,
          mttr: kpiRes.data.mttr,
          compliance: analyticsRes.data.maintenanceCompliance,
        });
        setTrends(trendRes.data);
      } catch (err) {
        console.error('Failed to load reports', err);
        setError('Failed to load reports');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <p>Loading...</p>;
  if (error || !kpis) return <p className="text-red-600">{error || 'No data available'}</p>;

  const labels = trends.map((t) => t.period);
  const costData = {
    labels,
    datasets: [
      {
        label: 'Maintenance Cost',
        data: trends.map((t) => t.maintenanceCost),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59,130,246,0.3)',
      },
    ],
  };
  const downtimeData = {
    labels,
    datasets: [
      {
        label: 'Asset Downtime',
        data: trends.map((t) => t.assetDowntime),
        borderColor: '#f97316',
        backgroundColor: 'rgba(249,115,22,0.3)',
      },
    ],
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-neutral-900">Reports</h2>
          <p className="text-neutral-500">Review key performance indicators</p>
        </div>
        <KpiExportButtons />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KpiWidget label="MTBF" value={kpis.mtbf.toFixed(1)} suffix="h" />
        <KpiWidget label="MTTR" value={kpis.mttr.toFixed(1)} suffix="h" />
        <KpiWidget label="Compliance" value={kpis.compliance.toFixed(1)} suffix="%" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Maintenance Cost Trend">
          <Line data={costData} data-testid="cost-trend" />
        </Card>
        <Card title="Asset Downtime Trend">
          <Line data={downtimeData} data-testid="downtime-trend" />
        </Card>
      </div>
    </div>
  );
}

