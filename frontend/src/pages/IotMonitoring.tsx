/*
 * SPDX-License-Identifier: MIT
 */

import { useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import { Activity, AlertTriangle, RefreshCcw } from 'lucide-react';

import Card from '@/components/common/Card';
import SimpleLineChart from '@/components/charts/SimpleLineChart';
import { fetchIotAlerts, fetchIotSignals, type IoTSignalSeries } from '@/api/iot';
import type { Alert } from '@/store/alertStore';
import { useHierarchyTree } from '@/features/assets/hooks';
import type { HierarchyAsset, HierarchyResponse } from '@/api/hierarchy';

const numberFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });

const formatValue = (value?: number | null) =>
  typeof value === 'number' ? numberFormatter.format(value) : '—';

const formatRelativeTime = (timestamp?: string) => {
  if (!timestamp) return '—';
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return '—';
  const diffMs = Date.now() - parsed.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const levelClasses: Record<Alert['level'], string> = {
  info: 'bg-sky-900/50 text-sky-200',
  warning: 'bg-amber-900/40 text-amber-200',
  critical: 'bg-rose-900/40 text-rose-200',
  success: 'bg-emerald-900/40 text-emerald-200',
};

const levelLabel: Record<Alert['level'], string> = {
  info: 'Info',
  warning: 'Warning',
  critical: 'Critical',
  success: 'Resolved',
};

const flattenAssetOptions = (
  hierarchy?: HierarchyResponse,
): { value: string; label: string }[] => {
  if (!hierarchy) return [];
  const options: { value: string; label: string }[] = [];
  const pushAsset = (asset: HierarchyAsset, prefix?: string) => {
    options.push({
      value: asset.id,
      label: prefix ? `${asset.name} — ${prefix}` : asset.name,
    });
  };
  hierarchy.departments.forEach((department) => {
    department.assets.forEach((asset) => pushAsset(asset, department.name));
    department.lines.forEach((line) => {
      line.assets.forEach((asset) => pushAsset(asset, `${line.name}`));
      line.stations.forEach((station) => {
        station.assets.forEach((asset) => pushAsset(asset, `${station.name}`));
      });
    });
  });
  return options.sort((a, b) => a.label.localeCompare(b.label));
};

const IotMonitoring = () => {
  const [assetFilter, setAssetFilter] = useState<'all' | string>('all');
  const [metricFilter, setMetricFilter] = useState<'all' | string>('all');
  const { data: hierarchy } = useHierarchyTree();

  const assetOptions = useMemo(() => flattenAssetOptions(hierarchy), [hierarchy]);

  const signalsQuery = useQuery(
    ['iot-signals', assetFilter, metricFilter],
    () =>
      fetchIotSignals({
        assetId: assetFilter !== 'all' ? assetFilter : undefined,
        metric: metricFilter !== 'all' ? metricFilter : undefined,
        limit: 150,
      }),
    { keepPreviousData: true, staleTime: 30_000 },
  );

  const alertsQuery = useQuery(['iot-alerts'], () => fetchIotAlerts(50), {
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  const signals = signalsQuery.data ?? [];
  const metricsOptions = useMemo(() => {
    const set = new Set<string>();
    signals.forEach((series) => {
      if (series.metric) {
        set.add(series.metric);
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [signals]);

  const summary = {
    telemetryCount: signals.reduce((sum, series) => sum + series.points.length, 0),
    trendingUp: signals.filter((series) => (series.change ?? 0) > 0).length,
    alertCount: alertsQuery.data?.length ?? 0,
  };

  const renderSignalCard = (series: IoTSignalSeries) => {
    const chartData = series.points.map((point) => ({
      label: new Date(point.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      value: point.value,
    }));
    return (
      <Card
        key={`${series.assetId}-${series.metric}`}
        title={`${series.assetName ?? 'Asset'} • ${series.metric}`}
        subtitle={`Last update ${formatRelativeTime(series.updatedAt)}`}
        className="bg-slate-900/80"
      >
        <div className="mb-4 flex flex-wrap items-center gap-4 text-sm text-slate-300">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Latest value</p>
            <p className="text-xl font-semibold text-slate-100">{formatValue(series.latestValue)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Change</p>
            <p className={`text-lg font-semibold ${series.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {series.change >= 0 ? '+' : ''}
              {numberFormatter.format(series.change ?? 0)}
            </p>
          </div>
        </div>
        <SimpleLineChart data={chartData} className="h-56" grid showDots />
      </Card>
    );
  };

  const alerts = alertsQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-white">IoT Monitoring</h1>
          <p className="text-sm text-slate-300">
            Observe live telemetry from connected assets and review automated alert history.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-slate-400">
            Asset
            <select
              value={assetFilter}
              onChange={(event) => setAssetFilter(event.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-primary-500 focus:outline-none"
            >
              <option value="all">All assets</option>
              {assetOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-slate-400">
            Metric
            <select
              value={metricFilter}
              onChange={(event) => setMetricFilter(event.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-primary-500 focus:outline-none"
            >
              <option value="all">All metrics</option>
              {metricsOptions.map((metric) => (
                <option key={metric} value={metric}>
                  {metric}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="flex items-center gap-3 text-sm text-slate-300">
            <span className="rounded-lg bg-primary-500/20 p-2 text-primary-300">
              <Activity className="h-5 w-5" />
            </span>
            Signals ingested
          </div>
          <p className="mt-3 text-3xl font-semibold text-white">{summary.telemetryCount}</p>
          <p className="text-xs text-slate-400">Last fetch window</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="flex items-center gap-3 text-sm text-slate-300">
            <span className="rounded-lg bg-emerald-500/20 p-2 text-emerald-300">
              <RefreshCcw className="h-5 w-5" />
            </span>
            Metrics trending upward
          </div>
          <p className="mt-3 text-3xl font-semibold text-white">{summary.trendingUp}</p>
          <p className="text-xs text-slate-400">Based on last data point</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="flex items-center gap-3 text-sm text-slate-300">
            <span className="rounded-lg bg-rose-500/20 p-2 text-rose-200">
              <AlertTriangle className="h-5 w-5" />
            </span>
            IoT alerts (30 min)
          </div>
          <p className="mt-3 text-3xl font-semibold text-white">{summary.alertCount}</p>
          <p className="text-xs text-slate-400">Auto-generated actions</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {signalsQuery.isLoading && (
          <Card title="Telemetry" className="lg:col-span-2">
            <p className="text-sm text-slate-400">Loading telemetry...</p>
          </Card>
        )}
        {!signalsQuery.isLoading && signals.length === 0 && (
          <Card title="Telemetry" className="lg:col-span-2">
            <p className="text-sm text-slate-400">No telemetry found for the selected filters.</p>
          </Card>
        )}
        {!signalsQuery.isLoading && signals.map((series) => renderSignalCard(series))}
      </div>

      <Card title="Alert history" subtitle="Most recent IoT-driven events" className="overflow-hidden">
        {alertsQuery.isLoading ? (
          <p className="text-sm text-slate-400">Loading alerts…</p>
        ) : alerts.length === 0 ? (
          <p className="text-sm text-slate-400">No IoT alerts have been generated yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-400">
                  <th className="py-3">Alert</th>
                  <th>Asset</th>
                  <th>Metric</th>
                  <th>Level</th>
                  <th>Detected</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((alert) => (
                  <tr key={alert._id} className="border-b border-slate-900/60 text-slate-200">
                    <td className="py-3 text-slate-100">{alert.message}</td>
                    <td className="py-3 text-slate-300">{alert.assetName ?? alert.asset ?? '—'}</td>
                    <td className="py-3 text-slate-300">{alert.metric ?? '—'}</td>
                    <td className="py-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${levelClasses[alert.level]}`}>
                        {levelLabel[alert.level]}
                      </span>
                    </td>
                    <td className="py-3 text-slate-300">
                      {formatRelativeTime(alert.timestamp ?? alert.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default IotMonitoring;
