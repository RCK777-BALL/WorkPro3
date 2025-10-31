/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import http from '@/lib/http';

interface GlobalMetric {
  plant: string;
  totalWorkOrders: number;
  completedWorkOrders: number;
  pmCompliance: number;
  avgWrenchTime: number;
  downtimeHours: number;
}

const METRICS = [
  { key: 'pmCompliance', label: 'PM Compliance (%)' },
  { key: 'avgWrenchTime', label: 'Avg Wrench Time (hrs)' },
  { key: 'downtimeHours', label: 'Downtime (hrs)' },
  { key: 'totalWorkOrders', label: 'Total Work Orders' },
] as const;

type MetricKey = (typeof METRICS)[number]['key'];

export default function GlobalAnalyticsDashboard() {
  const [data, setData] = useState<GlobalMetric[]>([]);
  const [metric, setMetric] = useState<MetricKey>('pmCompliance');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await http.get<GlobalMetric[]>('/analytics/global');
        if (!cancelled) {
          setData(response.data ?? []);
        }
      } catch (err) {
        console.error('Failed to load global analytics', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const totals = useMemo(() => {
    if (!data.length) {
      return {
        totalWorkOrders: 0,
        averageCompliance: 0,
        averageWrenchTime: 0,
        totalDowntime: 0,
      };
    }
    const totalWorkOrders = data.reduce((sum, plant) => sum + plant.totalWorkOrders, 0);
    const averageCompliance = Math.round(
      data.reduce((sum, plant) => sum + plant.pmCompliance, 0) / data.length,
    );
    const averageWrenchTime =
      data.reduce((sum, plant) => sum + plant.avgWrenchTime, 0) / data.length;
    const totalDowntime = data.reduce((sum, plant) => sum + plant.downtimeHours, 0);
    return { totalWorkOrders, averageCompliance, averageWrenchTime, totalDowntime };
  }, [data]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-100">Global Analytics</h1>
        <p className="text-sm text-slate-400">
          Compare performance across all plants to spot trends and opportunities.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs uppercase text-slate-500">Work Orders</p>
          <p className="text-xl font-semibold text-slate-100">{totals.totalWorkOrders}</p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs uppercase text-slate-500">Avg PM Compliance</p>
          <p className="text-xl font-semibold text-slate-100">{totals.averageCompliance}%</p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs uppercase text-slate-500">Avg Wrench Time</p>
          <p className="text-xl font-semibold text-slate-100">
            {totals.averageWrenchTime.toFixed(1)} hrs
          </p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs uppercase text-slate-500">Downtime Hours</p>
          <p className="text-xl font-semibold text-slate-100">{totals.totalDowntime.toFixed(1)}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <label htmlFor="metric" className="text-sm text-slate-300">
          Metric
        </label>
        <select
          id="metric"
          value={metric}
          onChange={(event) => setMetric(event.target.value as MetricKey)}
          className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100"
        >
          {METRICS.map((option) => (
            <option value={option.key} key={option.key}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-200">
          Plant Comparison ({METRICS.find((m) => m.key === metric)?.label})
        </h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="plant" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#1e293b',
                  color: '#e2e8f0',
                }}
              />
              <Bar dataKey={metric} fill="#38bdf8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
