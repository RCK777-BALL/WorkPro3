/*
 * SPDX-License-Identifier: MIT
 */

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { ArrowUpRight } from 'lucide-react';
import { saveAs } from 'file-saver';

import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import { SimplePieChart } from '@/components/charts/SimplePieChart';
import { SimpleBarChart } from '@/components/charts/SimpleBarChart';
import { SimpleLineChart } from '@/components/charts/SimpleLineChart';
import http from '@/lib/http';

import {
  DASHBOARD_RANGE_OPTIONS,
  type DashboardRangeKey,
  useDashboardAnalytics,
} from './hooks';

const STATUS_COLORS = ['#6366f1', '#22d3ee', '#f97316', '#22c55e', '#ef4444'];

const currencyFormatter = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat();

const formatPercent = (value: number) => `${value.toFixed(1)}%`;

const exportFormats = [
  { key: 'csv', label: 'CSV' },
  { key: 'xlsx', label: 'Excel' },
  { key: 'pdf', label: 'PDF' },
] as const;

type ExportFormat = (typeof exportFormats)[number]['key'];

type DashboardAnalyticsPanelProps = {
  className?: string;
};

export function DashboardAnalyticsPanel({ className }: DashboardAnalyticsPanelProps) {
  const [range, setRange] = useState<DashboardRangeKey>('30d');
  const { data, loading, error, params, refetch } = useDashboardAnalytics(range);
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [scheduleEmail, setScheduleEmail] = useState('ops@example.com');
  const [scheduleMessage, setScheduleMessage] = useState<string | null>(null);

  const kpis = data?.kpis;
  const pmCompliance = data?.pmCompliance;
  const workOrderVolume = data?.workOrderVolume;

  const statusData = useMemo(() => {
    if (!kpis) return [];
    return kpis.statuses.map((entry, index) => ({
      label: entry.status.replace(/_/g, ' '),
      value: entry.count,
      color: STATUS_COLORS[index % STATUS_COLORS.length],
    }));
  }, [kpis]);

  const performanceData = useMemo(() => {
    if (!kpis) return [];
    return [
      { label: 'Downtime (h)', value: Number(kpis.downtimeHours.toFixed(1)), color: '#fbbf24' },
      { label: 'MTTR (h)', value: Number(kpis.mttr.toFixed(2)), color: '#34d399' },
      { label: 'MTBF (h)', value: Number(kpis.mtbf.toFixed(2)), color: '#60a5fa' },
      { label: 'Labor util. (%)', value: Number(kpis.laborUtilization.toFixed(1)), color: '#a78bfa' },
      { label: 'Backlog aging (d)', value: Number(kpis.backlogAgingDays.toFixed(1)), color: '#f472b6' },
    ];
  }, [kpis]);

  const summaryRows = useMemo(() => {
    if (!kpis) return [];
    return [
      { label: 'Overdue work orders', value: numberFormatter.format(kpis.overdue) },
      {
        label: 'PM compliance',
        value: `${kpis.pmCompliance.completed}/${kpis.pmCompliance.total} (${formatPercent(kpis.pmCompliance.percentage)})`,
      },
      { label: 'Downtime hours', value: kpis.downtimeHours.toFixed(1) },
      { label: 'Maintenance cost', value: currencyFormatter.format(kpis.maintenanceCost) },
      { label: 'Parts spend', value: currencyFormatter.format(kpis.partsSpend) },
      { label: 'MTTR', value: `${kpis.mttr.toFixed(2)} h` },
      { label: 'MTBF', value: `${kpis.mtbf.toFixed(2)} h` },
      { label: 'Backlog aging', value: `${kpis.backlogAgingDays.toFixed(1)} days` },
      { label: 'Labor utilization', value: `${kpis.laborUtilization.toFixed(1)}%` },
    ];
  }, [kpis]);

  const mtbfTrend = useMemo(
    () => data?.mtbf.trend.map((point) => ({ label: point.period, value: point.value })) ?? [],
    [data?.mtbf.trend],
  );

  const pmTrend = useMemo(
    () => pmCompliance?.trend.map((point) => ({ label: point.period, value: point.value })) ?? [],
    [pmCompliance?.trend],
  );

  const workOrderTrend = useMemo(
    () => workOrderVolume?.trend.map((point) => ({ label: point.period, value: point.value })) ?? [],
    [workOrderVolume?.trend],
  );

  const workOrderStatusBreakdown = useMemo(() => {
    if (!workOrderVolume) return [];
    return workOrderVolume.byStatus.map((entry, index) => ({
      label: entry.status.replace(/_/g, ' '),
      value: entry.count,
      color: STATUS_COLORS[index % STATUS_COLORS.length],
    }));
  }, [workOrderVolume]);

  const handleExport = async (format: ExportFormat) => {
    setExporting(format);
    setExportError(null);
    try {
      const endpoint =
        format === 'csv'
          ? '/analytics/dashboard/kpis.csv'
          : format === 'xlsx'
          ? '/analytics/dashboard/kpis.xlsx'
          : '/analytics/dashboard/kpis.pdf';
      const response = await http.get<Blob>(endpoint, {
        params,
        responseType: 'blob',
      });
      const contentType = response.headers['content-type'] ?? 'application/octet-stream';
      const blob = new Blob([response.data], { type: contentType });
      saveAs(blob, `dashboard-kpis.${format}`);
    } catch (err) {
      // eslint-disable-next-line no-console -- surfaced for observability during development
      console.error('Failed to export dashboard KPIs', err);
      setExportError('Unable to export dashboard KPIs. Please try again.');
    } finally {
      setExporting(null);
    }
  };

  const handleSchedule = async () => {
    setScheduleMessage(null);
    try {
      await http.post('/analytics/dashboard/exports/schedule', {
        format: 'pdf',
        recipients: [scheduleEmail],
        cron: '0 6 * * 1',
      });
      setScheduleMessage('Weekly PDF delivery scheduled');
    } catch (err) {
      // eslint-disable-next-line no-console -- surfaced for observability during development
      console.error('Failed to schedule dashboard export', err);
      setScheduleMessage('Unable to schedule delivery');
    }
  };

  const controls = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <label className="flex items-center gap-2 text-sm text-slate-300">
        Range
        <select
          value={range}
          onChange={(event) => setRange(event.target.value as DashboardRangeKey)}
          className="rounded-md border border-white/10 bg-slate-900/60 px-3 py-1 text-sm text-white focus:border-primary-400 focus:outline-none"
        >
          {DASHBOARD_RANGE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <div className="flex flex-wrap gap-2">
        {exportFormats.map((format) => (
          <Button
            key={format.key}
            size="sm"
            variant="secondary"
            onClick={() => handleExport(format.key)}
            loading={exporting === format.key}
          >
            Export {format.label}
          </Button>
        ))}
        <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/80">
          <input
            value={scheduleEmail}
            onChange={(event) => setScheduleEmail(event.target.value)}
            className="w-44 rounded bg-transparent px-2 py-1 text-xs focus:outline-none"
            placeholder="delivery@example.com"
          />
          <Button size="xs" variant="primary" onClick={handleSchedule}>
            Schedule PDF
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <Card
      title="Maintenance KPIs"
      subtitle="Status mix, compliance, downtime, and cost metrics"
      headerActions={controls}
      className={clsx('border-white/10 bg-slate-900/80 text-white backdrop-blur', className)}
    >
      {exportError ? <p className="mb-4 text-sm text-red-300">{exportError}</p> : null}
      {scheduleMessage ? <p className="mb-4 text-xs text-emerald-200">{scheduleMessage}</p> : null}
      {error ? (
        <div className="flex flex-col gap-3 rounded-xl border border-red-400/50 bg-red-500/10 p-4 text-sm text-red-100">
          <p>{error}</p>
          <div>
            <Button size="sm" variant="outline" onClick={refetch}>
              Retry
            </Button>
          </div>
        </div>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-white/60">Status distribution</p>
              <p className="text-sm text-white/80">Work order mix by state</p>
            </div>
            {loading && !kpis ? <span className="text-xs text-white/60">Loading…</span> : null}
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <SimplePieChart data={statusData} className="h-48" />
            <ul className="space-y-2 text-sm">
              {statusData.map((item) => (
                <li key={item.label} className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                    {item.label}
                  </span>
                  <span className="font-semibold">{numberFormatter.format(item.value)}</span>
                </li>
              ))}
              {!statusData.length && !loading ? (
                <li className="text-sm text-white/60">No work orders in range.</li>
              ) : null}
            </ul>
          </div>
        </section>
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-white/60">Downtime & reliability</p>
              <p className="text-sm text-white/80">MTTR, MTBF, and downtime hours</p>
            </div>
            {loading && !kpis ? <span className="text-xs text-white/60">Loading…</span> : null}
          </div>
          <div className="mt-4 h-48">
            <SimpleBarChart data={performanceData} className="h-full" />
          </div>
        </section>
      </div>
      <section className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-white/60">Summary</p>
            <p className="text-sm text-white/80">Key KPI values for the selected period</p>
          </div>
          {loading && kpis ? <span className="text-xs text-white/60">Refreshing…</span> : null}
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <tbody>
              {summaryRows.map((row) => (
                <tr key={row.label} className="border-b border-white/10 last:border-none">
                  <td className="py-2 pr-4 text-white/70">{row.label}</td>
                  <td className="py-2 text-right font-semibold text-white">{row.value}</td>
                </tr>
              ))}
              {!summaryRows.length && !loading ? (
                <tr>
                  <td className="py-4 text-sm text-white/60" colSpan={2}>
                    No KPI data available for the selected range.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        {pmCompliance ? (
          <div className="mt-4">
            <p className="text-xs uppercase tracking-wider text-white/60">PM compliance trend</p>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-emerald-400"
                style={{ width: `${Math.min(pmCompliance.percentage, 100).toFixed(1)}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-white/70">
              {formatPercent(pmCompliance.percentage)} compliance across {numberFormatter.format(pmCompliance.total)} PM orders
            </p>
          </div>
        ) : null}
      </section>
      <section className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-white/60">Drill-down links</p>
            <p className="text-sm text-white/80">Open filtered work orders or tasks from each widget</p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Button
            as="a"
            variant="secondary"
            size="sm"
            className="justify-between"
            title="Show corrective work driving MTTR"
            href="/workorders?type=corrective&status=completed&sort=duration_desc"
          >
            MTTR work orders
            <ArrowUpRight className="ml-2 h-4 w-4" />
          </Button>
          <Button
            as="a"
            variant="secondary"
            size="sm"
            className="justify-between"
            title="Review failure spacing for MTBF"
            href="/workorders?type=corrective&status=completed&sort=completedAt_desc"
          >
            MTBF timeline
            <ArrowUpRight className="ml-2 h-4 w-4" />
          </Button>
          <Button
            as="a"
            variant="secondary"
            size="sm"
            className="justify-between"
            title="Inspect aging backlog and overdue risk"
            href="/workorders?status=open,overdue&sort=age_desc"
          >
            Backlog aging
            <ArrowUpRight className="ml-2 h-4 w-4" />
          </Button>
          <Button
            as="a"
            variant="secondary"
            size="sm"
            className="justify-between"
            title="Show labor entries contributing to utilization"
            href="/workorders?status=completed&view=timesheets"
          >
            Labor utilization
            <ArrowUpRight className="ml-2 h-4 w-4" />
          </Button>
          <Button
            as="a"
            variant="secondary"
            size="sm"
            className="justify-between"
            title="Parts spend by order"
            href="/workorders?status=completed&sort=parts_cost_desc"
          >
            Parts spend
            <ArrowUpRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-white/60">MTBF trend</p>
              <p className="text-sm text-white/80">Mean time between failures over time</p>
            </div>
            {data?.mtbf ? (
              <span className="text-xs text-white/70">{data.mtbf.value.toFixed(2)} h</span>
            ) : null}
          </div>
          <div className="mt-4 h-48">
            <SimpleLineChart data={mtbfTrend} className="h-full" stroke="#60a5fa" />
          </div>
        </section>
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-white/60">PM compliance</p>
              <p className="text-sm text-white/80">Completion rate for preventive work</p>
            </div>
            {pmCompliance ? (
              <span className="text-xs text-emerald-200">{formatPercent(pmCompliance.percentage)}</span>
            ) : null}
          </div>
          <div className="mt-4 h-48">
            <SimpleLineChart data={pmTrend} className="h-full" stroke="#34d399" showDots />
          </div>
          {pmCompliance ? (
            <p className="mt-3 text-xs text-white/70">
              {numberFormatter.format(pmCompliance.completed)} of {numberFormatter.format(pmCompliance.total)} PM orders completed
              in range
            </p>
          ) : null}
        </section>
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-white/60">Work order volume</p>
              <p className="text-sm text-white/80">Daily creation trend and status mix</p>
            </div>
            {workOrderVolume ? (
              <span className="text-xs text-white/70">{numberFormatter.format(workOrderVolume.total)} total</span>
            ) : null}
          </div>
          <div className="mt-4 h-48">
            <SimpleBarChart data={workOrderTrend} className="h-full" />
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {workOrderStatusBreakdown.map((entry) => (
              <div key={entry.label} className="flex items-center justify-between text-xs text-white/80">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                  {entry.label}
                </span>
                <span className="font-semibold text-white">{numberFormatter.format(entry.value)}</span>
              </div>
            ))}
            {!workOrderStatusBreakdown.length && !loading ? (
              <p className="text-xs text-white/60">No work order volume in range.</p>
            ) : null}
          </div>
        </section>
      </div>
    </Card>
  );
}

export default DashboardAnalyticsPanel;
