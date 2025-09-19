/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useMemo, useState } from 'react';
import Card from '@/components/common/Card';
import KpiWidget from '@/components/kpi/KpiWidget';
import KpiExportButtons from '@/components/kpi/KpiExportButtons';
import http from '@/lib/http';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend);

type TrendPoint = { period: string; value: number };

type BenchmarkEntry = {
  id: string;
  name: string;
  availability: number;
  performance: number;
  quality: number;
  oee: number;
};

interface KPIData {
  mttr: number;
  mtbf: number;
  backlog: number;
  availability: number;
  performance: number;
  quality: number;
  oee: number;
  energy: {
    totalKwh: number;
    averagePerHour: number;
    perAsset: { assetId: string; assetName?: string; totalKwh: number }[];
    perSite: { siteId: string; siteName?: string; totalKwh: number }[];
  };
  downtime: {
    totalMinutes: number;
    reasons: { reason: string; minutes: number }[];
    trend: TrendPoint[];
  };
  benchmarks: {
    assets: BenchmarkEntry[];
    sites: BenchmarkEntry[];
  };
  thresholds: {
    availability: number;
    performance: number;
    quality: number;
    oee: number;
  };
  range: { start?: string; end?: string };
}

interface TrendData {
  oee: TrendPoint[];
  availability: TrendPoint[];
  performance: TrendPoint[];
  quality: TrendPoint[];
  energy: TrendPoint[];
  downtime: TrendPoint[];
}

type MergedTrend = {
  period: string;
  oee?: number;
  availability?: number;
  performance?: number;
  quality?: number;
  energy?: number;
  downtime?: number;
};

const ranges = [
  { label: 'Last 7 days', value: 7 },
  { label: 'Last 30 days', value: 30 },
  { label: 'Last 90 days', value: 90 },
];

function determineStatus(value: number, threshold: number): 'good' | 'warning' | 'critical' {
  if (value >= threshold) return 'good';
  if (value >= threshold * 0.9) return 'warning';
  return 'critical';
}

function mergeTrends(data: TrendData | null): MergedTrend[] {
  if (!data) return [];
  const map = new Map<string, MergedTrend>();
  const assign = (key: keyof MergedTrend, points: TrendPoint[]) => {
    points.forEach((point) => {
      const entry = map.get(point.period) ?? { period: point.period };
      entry[key] = point.value;
      map.set(point.period, entry);
    });
  };
  assign('oee', data.oee);
  assign('availability', data.availability);
  assign('performance', data.performance);
  assign('quality', data.quality);
  assign('energy', data.energy);
  assign('downtime', data.downtime);
  return Array.from(map.values()).sort((a, b) => (a.period < b.period ? -1 : 1));
}

export default function Reports() {
  const [kpis, setKpis] = useState<KPIData | null>(null);
  const [trends, setTrends] = useState<TrendData | null>(null);
  const [range, setRange] = useState<number>(30);
  const [selectedSite, setSelectedSite] = useState<string>('all');
  const [selectedAsset, setSelectedAsset] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { params, query } = useMemo(() => {
    const end = new Date();
    const start = new Date(end.getTime() - range * 24 * 60 * 60 * 1000);
    const searchParams = new URLSearchParams();
    searchParams.set('startDate', start.toISOString());
    searchParams.set('endDate', end.toISOString());
    if (selectedSite !== 'all') searchParams.set('siteIds', selectedSite);
    if (selectedAsset !== 'all') searchParams.set('assetIds', selectedAsset);
    const paramObject: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      paramObject[key] = value;
    });
    return { params: paramObject, query: searchParams.toString() };
  }, [range, selectedSite, selectedAsset]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [kpiRes, trendRes] = await Promise.all([
          http.get<KPIData>('/v1/analytics/kpis', { params }),
          http.get<TrendData>('/v1/analytics/trends', { params }),
        ]);
        setKpis(kpiRes.data);
        setTrends(trendRes.data);
      } catch (err) {
        console.error('Failed to load reports', err);
        setError('Failed to load reports');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [params]);

  const mergedTrends = useMemo(() => mergeTrends(trends), [trends]);
  const labels = mergedTrends.map((point) => point.period);

  const performanceLineData = useMemo(
    () => ({
      labels,
      datasets: [
        {
          label: 'OEE',
          data: mergedTrends.map((point) => (point.oee ?? 0) * 100),
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37,99,235,0.2)',
          tension: 0.3,
        },
        {
          label: 'Availability',
          data: mergedTrends.map((point) => (point.availability ?? 0) * 100),
          borderColor: '#10b981',
          backgroundColor: 'rgba(16,185,129,0.2)',
          tension: 0.3,
        },
        {
          label: 'Performance',
          data: mergedTrends.map((point) => (point.performance ?? 0) * 100),
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245,158,11,0.2)',
          tension: 0.3,
        },
        {
          label: 'Quality',
          data: mergedTrends.map((point) => (point.quality ?? 0) * 100),
          borderColor: '#8b5cf6',
          backgroundColor: 'rgba(139,92,246,0.2)',
          tension: 0.3,
        },
      ],
    }),
    [labels, mergedTrends],
  );

  const energyBarData = useMemo(
    () => ({
      labels,
      datasets: [
        {
          label: 'Energy (kWh)',
          data: mergedTrends.map((point) => point.energy ?? 0),
          backgroundColor: '#16a34a',
        },
      ],
    }),
    [labels, mergedTrends],
  );

  const downtimeTrendData = useMemo(
    () => ({
      labels,
      datasets: [
        {
          label: 'Downtime (min)',
          data: mergedTrends.map((point) => point.downtime ?? 0),
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239,68,68,0.2)',
          tension: 0.3,
        },
      ],
    }),
    [labels, mergedTrends],
  );

  const downtimeReasonData = useMemo(
    () => ({
      labels: kpis?.downtime.reasons.map((item) => item.reason) ?? [],
      datasets: [
        {
          label: 'Minutes',
          data: kpis?.downtime.reasons.map((item) => item.minutes) ?? [],
          backgroundColor: '#f97316',
        },
      ],
    }),
    [kpis?.downtime.reasons],
  );

  if (loading) return <p>Loading...</p>;
  if (error || !kpis || !trends) return <p className="text-red-600">{error || 'No data available'}</p>;

  const availabilityStatus = determineStatus(kpis.availability, kpis.thresholds.availability);
  const performanceStatus = determineStatus(kpis.performance, kpis.thresholds.performance);
  const qualityStatus = determineStatus(kpis.quality, kpis.thresholds.quality);
  const oeeStatus = determineStatus(kpis.oee, kpis.thresholds.oee);

  const downtimeTotalHours = (kpis.downtime.totalMinutes / 60).toFixed(1);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-neutral-900">Reports</h2>
          <p className="text-neutral-500">Monitor production effectiveness and downtime</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <label htmlFor="range" className="text-sm text-neutral-600">
              Range
            </label>
            <select
              id="range"
              className="border border-neutral-300 rounded-md px-2 py-1 text-sm"
              value={range}
              onChange={(event) => setRange(Number(event.target.value))}
            >
              {ranges.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="site" className="text-sm text-neutral-600">
              Site
            </label>
            <select
              id="site"
              className="border border-neutral-300 rounded-md px-2 py-1 text-sm"
              value={selectedSite}
              onChange={(event) => {
                setSelectedSite(event.target.value);
                setSelectedAsset('all');
              }}
            >
              <option value="all">All</option>
              {kpis.benchmarks.sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="asset" className="text-sm text-neutral-600">
              Asset
            </label>
            <select
              id="asset"
              className="border border-neutral-300 rounded-md px-2 py-1 text-sm"
              value={selectedAsset}
              onChange={(event) => setSelectedAsset(event.target.value)}
            >
              <option value="all">All</option>
              {kpis.benchmarks.assets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <KpiExportButtons query={query} />
        <div className="flex gap-2">
          <KpiExportButtons resource="trends" query={query} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <KpiWidget
          label="OEE"
          value={(kpis.oee * 100).toFixed(1)}
          suffix="%"
          targetLabel={`${(kpis.thresholds.oee * 100).toFixed(0)}%`}
          status={oeeStatus}
          helperText={`${kpis.benchmarks.assets.length} assets tracked`}
        />
        <KpiWidget
          label="Availability"
          value={(kpis.availability * 100).toFixed(1)}
          suffix="%"
          targetLabel={`${(kpis.thresholds.availability * 100).toFixed(0)}%`}
          status={availabilityStatus}
          helperText={`Downtime: ${downtimeTotalHours} h`}
        />
        <KpiWidget
          label="Performance"
          value={(kpis.performance * 100).toFixed(1)}
          suffix="%"
          targetLabel={`${(kpis.thresholds.performance * 100).toFixed(0)}%`}
          status={performanceStatus}
          helperText={`MTBF ${kpis.mtbf.toFixed(1)} h`}
        />
        <KpiWidget
          label="Quality"
          value={(kpis.quality * 100).toFixed(1)}
          suffix="%"
          targetLabel={`${(kpis.thresholds.quality * 100).toFixed(0)}%`}
          status={qualityStatus}
          helperText={`MTTR ${kpis.mttr.toFixed(1)} h`}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KpiWidget label="Backlog" value={kpis.backlog} helperText="Open work orders" />
        <KpiWidget
          label="Energy"
          value={kpis.energy.totalKwh.toFixed(1)}
          suffix=" kWh"
          helperText={`Avg ${kpis.energy.averagePerHour.toFixed(2)} kWh/h`}
        />
        <KpiWidget
          label="Downtime"
          value={(kpis.downtime.totalMinutes / 60).toFixed(1)}
          suffix=" h"
          helperText={`${kpis.downtime.reasons[0]?.reason ?? 'n/a'} most common`}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card title="OEE Components Trend">
          <Line data={performanceLineData} data-testid="oee-trend" />
        </Card>
        <Card title="Energy Consumption">
          <Bar data={energyBarData} data-testid="energy-trend" />
        </Card>
        <Card title="Downtime Trend">
          <Line data={downtimeTrendData} data-testid="downtime-trend" />
        </Card>
        <Card title="Downtime Reasons">
          <Bar data={downtimeReasonData} data-testid="downtime-reasons" />
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Asset Benchmarking" subtitle="OEE sorted by performance">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-neutral-500">
                  <th className="py-2 pr-4">Asset</th>
                  <th className="py-2 pr-4">OEE</th>
                  <th className="py-2 pr-4">Availability</th>
                  <th className="py-2 pr-4">Performance</th>
                  <th className="py-2 pr-4">Quality</th>
                </tr>
              </thead>
              <tbody>
                {kpis.benchmarks.assets.map((asset) => (
                  <tr key={asset.id} className="border-t border-neutral-200">
                    <td className="py-2 pr-4 font-medium">{asset.name}</td>
                    <td className="py-2 pr-4">{(asset.oee * 100).toFixed(1)}%</td>
                    <td className="py-2 pr-4">{(asset.availability * 100).toFixed(1)}%</td>
                    <td className="py-2 pr-4">{(asset.performance * 100).toFixed(1)}%</td>
                    <td className="py-2 pr-4">{(asset.quality * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card title="Site Comparison" subtitle="Energy intensity per site">
          <div className="space-y-3">
            {kpis.energy.perSite.map((site) => (
              <div key={site.siteId} className="flex justify-between text-sm">
                <span className="font-medium">{site.siteName ?? site.siteId}</span>
                <span>{site.totalKwh.toFixed(1)} kWh</span>
              </div>
            ))}
            {kpis.energy.perSite.length === 0 && <p className="text-sm text-neutral-500">No site level data</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
