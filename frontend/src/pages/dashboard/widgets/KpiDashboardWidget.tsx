/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Download,
  Gauge,
  RefreshCw,
  Timer,
} from 'lucide-react';

import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import { SimpleBarChart } from '@/components/charts/SimpleBarChart';
import { SimpleLineChart } from '@/components/charts/SimpleLineChart';
import { SimplePieChart } from '@/components/charts/SimplePieChart';
import http from '@/lib/http';

type MttrMtbfSeriesPoint = {
  period: string;
  mttrHours: number;
  mtbfHours: number;
  failures: number;
};

type MttrMtbfResponse = {
  range: { start: string; end: string; granularity: 'day' | 'month' };
  series: MttrMtbfSeriesPoint[];
};

type BacklogAgingBucket = {
  label: string;
  minDays: number;
  maxDays?: number;
  count: number;
};

type BacklogAgingResponse = {
  asOf: string;
  totalOpen: number;
  averageAgeDays: number;
  buckets: BacklogAgingBucket[];
};

type SlaPerformancePoint = {
  period: string;
  responseRate: number;
  resolutionRate: number;
  candidates: number;
};

type SlaPerformanceResponse = {
  range: { start: string; end: string; granularity: 'day' | 'month' };
  series: SlaPerformancePoint[];
};

type TechnicianUtilizationEntry = {
  technicianId: string;
  technicianName: string;
  hoursLogged: number;
  capacityHours: number;
  utilizationRate: number;
};

type TechnicianUtilizationResponse = {
  range: { start: string; end: string };
  averageUtilization: number;
  technicians: TechnicianUtilizationEntry[];
};

const chartColors = ['#6366f1', '#22c55e', '#f97316', '#ef4444', '#0ea5e9', '#a855f7'];

export function KpiDashboardWidget() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mttrMtbf, setMttrMtbf] = useState<MttrMtbfResponse | null>(null);
  const [backlogAging, setBacklogAging] = useState<BacklogAgingResponse | null>(null);
  const [slaPerformance, setSlaPerformance] = useState<SlaPerformanceResponse | null>(null);
  const [technicianUtilization, setTechnicianUtilization] = useState<TechnicianUtilizationResponse | null>(null);

  const fetchMetrics = async () => {
    try {
      setError(null);
      setLoading(true);
      const [mttrRes, backlogRes, slaRes, techRes] = await Promise.all([
        http.get<MttrMtbfResponse>('/analytics/v2/metrics/mttr-mtbf'),
        http.get<BacklogAgingResponse>('/analytics/v2/metrics/backlog-aging'),
        http.get<SlaPerformanceResponse>('/analytics/v2/metrics/sla-performance'),
        http.get<TechnicianUtilizationResponse>('/analytics/v2/metrics/technician-utilization'),
      ]);

      setMttrMtbf(mttrRes.data);
      setBacklogAging(backlogRes.data);
      setSlaPerformance(slaRes.data);
      setTechnicianUtilization(techRes.data);
    } catch {
      setError('Unable to load KPI analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchMetrics();
  }, []);

  const mttrSeries = useMemo(
    () =>
      mttrMtbf?.series.map((point) => ({
        label: formatPeriod(point.period, mttrMtbf.range.granularity),
        value: point.mttrHours,
      })) ??
      [],
    [mttrMtbf],
  );

  const mtbfSeries = useMemo(
    () =>
      mttrMtbf?.series.map((point) => ({
        label: formatPeriod(point.period, mttrMtbf.range.granularity),
        value: point.mtbfHours,
      })) ??
      [],
    [mttrMtbf],
  );

  const slaSeries = useMemo(
    () =>
      slaPerformance?.series.map((point) => ({
        label: formatPeriod(point.period, slaPerformance.range.granularity),
        value: point.resolutionRate,
      })) ??
      [],
    [slaPerformance],
  );

  const backlogSeries = useMemo(
    () =>
      backlogAging?.buckets.map((bucket, index) => ({
        label: bucket.label,
        value: bucket.count,
        color: chartColors[index % chartColors.length],
      })) ??
      [],
    [backlogAging],
  );

  const utilizationSeries = useMemo(
    () =>
      technicianUtilization?.technicians.slice(0, 6).map((entry, index) => ({
        label: entry.technicianName.split(' ')[0],
        value: entry.utilizationRate,
        color: chartColors[index % chartColors.length],
      })) ??
      [],
    [technicianUtilization],
  );

  const exportLinks = [
    { label: 'MTTR/MTBF CSV', href: '/api/analytics/v2/metrics/mttr-mtbf.csv' },
    { label: 'SLA CSV', href: '/api/analytics/v2/metrics/sla-performance.csv' },
    { label: 'Backlog CSV', href: '/api/analytics/v2/metrics/backlog-aging.csv' },
    { label: 'Utilization CSV', href: '/api/analytics/v2/metrics/technician-utilization.csv' },
    { label: 'MTTR/MTBF PDF', href: '/api/analytics/v2/metrics/mttr-mtbf.pdf' },
    { label: 'SLA PDF', href: '/api/analytics/v2/metrics/sla-performance.pdf' },
    { label: 'Backlog PDF', href: '/api/analytics/v2/metrics/backlog-aging.pdf' },
    { label: 'Utilization PDF', href: '/api/analytics/v2/metrics/technician-utilization.pdf' },
  ];

  return (
    <Card
      title="KPI Performance Overview"
      subtitle="Reliability, backlog aging, SLA, and utilization snapshots"
      icon={<Gauge className="h-5 w-5 text-indigo-400" />}
      headerActions={
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => fetchMetrics()} disabled={loading}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
          <div className="relative group">
            <Button size="sm" variant="secondary">
              <Download className="h-4 w-4" /> Export
            </Button>
            <div className="absolute right-0 z-20 mt-2 hidden w-56 rounded-lg border border-[var(--wp-color-border)] bg-[var(--wp-color-surface)] p-2 text-xs shadow-lg group-hover:block">
              {exportLinks.map((link) => (
                <button
                  key={link.href}
                  type="button"
                  className="flex w-full items-center justify-between rounded-md px-2 py-1 text-left text-[var(--wp-color-text)] hover:bg-[var(--wp-color-surface-elevated)]"
                  onClick={() => {
                    window.location.href = link.href;
                  }}
                >
                  <span>{link.label}</span>
                  <Download className="h-3 w-3" />
                </button>
              ))}
            </div>
          </div>
        </div>
      }
    >
      {error ? (
        <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-[var(--wp-color-text-muted)]">
            <Timer className="h-4 w-4 text-[var(--wp-color-primary)]" />
            MTTR Trend
          </div>
          {loading ? (
            <LoadingBox />
          ) : (
            <div className="h-48">
              <SimpleLineChart data={mttrSeries} stroke="#6366f1" />
            </div>
          )}
          <p className="text-xs text-[var(--wp-color-text-muted)]">
            Avg: {formatAverage(mttrMtbf?.series.map((point) => point.mttrHours))} hours
          </p>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-[var(--wp-color-text-muted)]">
            <Activity className="h-4 w-4 text-emerald-300" />
            MTBF Trend
          </div>
          {loading ? (
            <LoadingBox />
          ) : (
            <div className="h-48">
              <SimpleLineChart data={mtbfSeries} stroke="#22c55e" />
            </div>
          )}
          <p className="text-xs text-[var(--wp-color-text-muted)]">
            Avg: {formatAverage(mttrMtbf?.series.map((point) => point.mtbfHours))} hours
          </p>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-[var(--wp-color-text-muted)]">
            <AlertTriangle className="h-4 w-4 text-amber-300" />
            Backlog Aging Mix
          </div>
          {loading ? (
            <LoadingBox />
          ) : (
            <div className="h-48">
              <SimpleBarChart data={backlogSeries} />
            </div>
          )}
          <p className="text-xs text-[var(--wp-color-text-muted)]">
            Open: {backlogAging?.totalOpen ?? 0} • Avg age {backlogAging?.averageAgeDays ?? 0} days
          </p>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-[var(--wp-color-text-muted)]">
            <Gauge className="h-4 w-4 text-sky-300" />
            SLA Resolution Trend
          </div>
          {loading ? (
            <LoadingBox />
          ) : (
            <div className="h-48">
              <SimpleLineChart data={slaSeries} stroke="#0ea5e9" />
            </div>
          )}
          <p className="text-xs text-[var(--wp-color-text-muted)]">
            Avg resolution: {formatAverage(slaPerformance?.series.map((point) => point.resolutionRate))}%
          </p>
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr,1fr]">
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-[var(--wp-color-text-muted)]">
            <Gauge className="h-4 w-4 text-[var(--wp-color-primary)]" />
            Technician Utilization
          </div>
          {loading ? (
            <LoadingBox />
          ) : (
            <div className="h-52">
              <SimplePieChart data={utilizationSeries} />
            </div>
          )}
          <p className="text-xs text-[var(--wp-color-text-muted)]">
            Avg utilization: {technicianUtilization?.averageUtilization ?? 0}%
          </p>
        </section>
        <section className="space-y-3">
          <div className="text-sm text-[var(--wp-color-text-muted)]">Top technicians</div>
          <div className="space-y-3">
            {(technicianUtilization?.technicians ?? []).slice(0, 5).map((tech) => (
              <div key={tech.technicianId} className="rounded-lg border border-[var(--wp-color-border)] bg-[color-mix(in_srgb,var(--wp-color-surface)_70%,transparent)] p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--wp-color-text)]">{tech.technicianName}</span>
                  <span className="text-[var(--wp-color-text-muted)]">{tech.utilizationRate}%</span>
                </div>
                <div className="mt-2 h-1.5 w-full rounded-full bg-[var(--wp-color-surface-elevated)]">
                  <div
                    className="h-1.5 rounded-full bg-indigo-500"
                    style={{ width: `${Math.min(100, tech.utilizationRate)}%` }}
                  />
                </div>
                <div className="mt-2 text-xs text-[var(--wp-color-text-muted)]">
                  {tech.hoursLogged}h logged of {tech.capacityHours}h
                </div>
              </div>
            ))}
            {!loading && (technicianUtilization?.technicians.length ?? 0) === 0 ? (
              <p className="text-sm text-[var(--wp-color-text-muted)]">No technician utilization logged.</p>
            ) : null}
          </div>
        </section>
      </div>
    </Card>
  );
}

function LoadingBox() {
  return <div className="h-48 animate-pulse rounded-lg border border-dashed border-[var(--wp-color-border)] bg-[color-mix(in_srgb,var(--wp-color-surface)_60%,transparent)]" />;
}

function formatPeriod(value: string, granularity: 'day' | 'month') {
  const date = new Date(value);
  if (granularity === 'day') {
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
  return date.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
}

function formatAverage(values?: number[]) {
  if (!values || values.length === 0) return 0;
  const total = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Number(total.toFixed(1));
}

