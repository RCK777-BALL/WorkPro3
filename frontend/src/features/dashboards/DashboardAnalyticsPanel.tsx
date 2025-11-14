/*
 * SPDX-License-Identifier: MIT
 */

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { saveAs } from 'file-saver';

import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import { SimplePieChart } from '@/components/charts/SimplePieChart';
import { SimpleBarChart } from '@/components/charts/SimpleBarChart';
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

  const statusData = useMemo(() => {
    if (!data) return [];
    return data.statuses.map((entry, index) => ({
      label: entry.status.replace(/_/g, ' '),
      value: entry.count,
      color: STATUS_COLORS[index % STATUS_COLORS.length],
    }));
  }, [data]);

  const performanceData = useMemo(() => {
    if (!data) return [];
    return [
      { label: 'Downtime (h)', value: Number(data.downtimeHours.toFixed(1)), color: '#fbbf24' },
      { label: 'MTTR (h)', value: Number(data.mttr.toFixed(2)), color: '#34d399' },
      { label: 'MTBF (h)', value: Number(data.mtbf.toFixed(2)), color: '#60a5fa' },
    ];
  }, [data]);

  const summaryRows = useMemo(() => {
    if (!data) return [];
    return [
      { label: 'Overdue work orders', value: numberFormatter.format(data.overdue) },
      { label: 'PM compliance', value: `${data.pmCompliance.completed}/${data.pmCompliance.total} (${formatPercent(data.pmCompliance.percentage)})` },
      { label: 'Downtime hours', value: data.downtimeHours.toFixed(1) },
      { label: 'Maintenance cost', value: currencyFormatter.format(data.maintenanceCost) },
      { label: 'MTTR', value: `${data.mttr.toFixed(2)} h` },
      { label: 'MTBF', value: `${data.mtbf.toFixed(2)} h` },
    ];
  }, [data]);

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
            {loading && !data ? <span className="text-xs text-white/60">Loading…</span> : null}
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
            {loading && !data ? <span className="text-xs text-white/60">Loading…</span> : null}
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
          {loading && data ? <span className="text-xs text-white/60">Refreshing…</span> : null}
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
        {data ? (
          <div className="mt-4">
            <p className="text-xs uppercase tracking-wider text-white/60">PM compliance trend</p>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-emerald-400"
                style={{ width: `${Math.min(data.pmCompliance.percentage, 100).toFixed(1)}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-white/70">
              {formatPercent(data.pmCompliance.percentage)} compliance across {numberFormatter.format(data.pmCompliance.total)} PM
              orders
            </p>
          </div>
        ) : null}
      </section>
    </Card>
  );
}

export default DashboardAnalyticsPanel;
