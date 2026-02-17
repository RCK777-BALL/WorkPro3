/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
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

interface CorporateSiteMetric {
  siteId: string;
  siteName?: string;
  tenantId: string;
  totalWorkOrders: number;
  openWorkOrders: number;
  completedWorkOrders: number;
  backlog: number;
  mttrHours: number;
  pmCompliance: { percentage: number };
  downtimeHours?: number;
}

interface LegacyGlobalMetric {
  plant: string;
  siteId?: string;
  siteName?: string;
  tenantId?: string;
  totalWorkOrders: number;
  completedWorkOrders: number;
  pmCompliance: number;
  avgWrenchTime: number;
  downtimeHours: number;
}

interface GlobalMetric {
  plant: string;
  siteId?: string;
  tenantId?: string;
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
    const mapCorporate = (payload?: CorporateSiteMetric[]): GlobalMetric[] =>
      (payload ?? []).map((site) => ({
        plant: site.siteName ?? 'Unassigned',
        totalWorkOrders: site.totalWorkOrders,
        completedWorkOrders: site.completedWorkOrders,
        pmCompliance: Math.round(site.pmCompliance.percentage),
        avgWrenchTime: Number(site.mttrHours.toFixed(2)),
        downtimeHours: site.downtimeHours ?? 0,
        ...(site.siteId ? { siteId: site.siteId } : {}),
        ...(site.tenantId ? { tenantId: site.tenantId } : {}),
      }));

    const mapLegacy = (payload?: LegacyGlobalMetric[]): GlobalMetric[] =>
      (payload ?? []).map((item) => ({
        plant: item.siteName ?? item.plant,
        totalWorkOrders: item.totalWorkOrders,
        completedWorkOrders: item.completedWorkOrders,
        pmCompliance: item.pmCompliance,
        avgWrenchTime: item.avgWrenchTime,
        downtimeHours: item.downtimeHours,
        ...(item.siteId ? { siteId: item.siteId } : {}),
        ...(item.tenantId ? { tenantId: item.tenantId } : {}),
      }));

    const load = async () => {
      try {
        const response = await http.get<CorporateSiteMetric[]>('/analytics/corporate/sites');
        if (!cancelled) {
          setData(mapCorporate(response.data));
        }
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 403) {
          try {
            const fallback = await http.get<LegacyGlobalMetric[]>('/analytics/global');
            if (!cancelled) {
              setData(mapLegacy(fallback.data));
            }
          } catch (fallbackErr) {
            if (!cancelled) {
              console.error('Failed to load global analytics', fallbackErr);
            }
          }
          return;
        }
        if (!cancelled) {
          console.error('Failed to load global analytics', err);
        }
      }
    };

    void load();
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
        <h1 className="text-2xl font-semibold text-[var(--wp-color-text)]">Global Analytics</h1>
        <p className="text-sm text-[var(--wp-color-text-muted)]">
          Compare performance across all plants to spot trends and opportunities.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-[var(--wp-color-border)] bg-[color-mix(in_srgb,var(--wp-color-surface)_70%,transparent)] p-4">
          <p className="text-xs uppercase text-[var(--wp-color-text-muted)]">Work Orders</p>
          <p className="text-xl font-semibold text-[var(--wp-color-text)]">{totals.totalWorkOrders}</p>
        </div>
        <div className="rounded-lg border border-[var(--wp-color-border)] bg-[color-mix(in_srgb,var(--wp-color-surface)_70%,transparent)] p-4">
          <p className="text-xs uppercase text-[var(--wp-color-text-muted)]">Avg PM Compliance</p>
          <p className="text-xl font-semibold text-[var(--wp-color-text)]">{totals.averageCompliance}%</p>
        </div>
        <div className="rounded-lg border border-[var(--wp-color-border)] bg-[color-mix(in_srgb,var(--wp-color-surface)_70%,transparent)] p-4">
          <p className="text-xs uppercase text-[var(--wp-color-text-muted)]">Avg Wrench Time</p>
          <p className="text-xl font-semibold text-[var(--wp-color-text)]">
            {totals.averageWrenchTime.toFixed(1)} hrs
          </p>
        </div>
        <div className="rounded-lg border border-[var(--wp-color-border)] bg-[color-mix(in_srgb,var(--wp-color-surface)_70%,transparent)] p-4">
          <p className="text-xs uppercase text-[var(--wp-color-text-muted)]">Downtime Hours</p>
          <p className="text-xl font-semibold text-[var(--wp-color-text)]">{totals.totalDowntime.toFixed(1)}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <label htmlFor="metric" className="text-sm text-[var(--wp-color-text-muted)]">
          Metric
        </label>
        <select
          id="metric"
          value={metric}
          onChange={(event) => setMetric(event.target.value as MetricKey)}
          className="rounded-md border border-[var(--wp-color-border)] bg-[var(--wp-color-surface)] px-2 py-1 text-sm text-[var(--wp-color-text)]"
        >
          {METRICS.map((option) => (
            <option value={option.key} key={option.key}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-lg border border-[var(--wp-color-border)] bg-[color-mix(in_srgb,var(--wp-color-surface)_70%,transparent)] p-4">
        <h2 className="mb-3 text-sm font-semibold text-[var(--wp-color-text)]">
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

