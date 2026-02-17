/*
 * SPDX-License-Identifier: MIT
 */

import { useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import { Activity, AlertTriangle, RefreshCcw, Radio, ScrollText } from 'lucide-react';

import Card from '@/components/common/Card';
import SimpleLineChart from '@/components/charts/SimpleLineChart';
import {
  fetchConditionRules,
  fetchIotAlerts,
  fetchIotSignals,
  fetchSensorDevices,
  IoTSignalQuery,
  type ConditionRule,
  type IoTSignalSeries,
  type SensorDevice,
} from '@/api/iot';
import type { Alert } from '@/store/alertStore';
import { useHierarchyTree } from '@/features/assets/hooks';
import type { HierarchyAsset, HierarchyResponse } from '@/api/hierarchy';
import { addMeterReading, fetchMeters, type Meter } from '@/api/meters';
import { enqueueMeterReading } from '@/utils/offlineQueue';
import { emitToast } from '@/context/ToastContext';
import { syncManager } from '@/utils/syncManager';

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

const statusClasses: Record<SensorDevice['status'], string> = {
  online: 'bg-emerald-900/40 text-emerald-200',
  offline: 'bg-rose-900/40 text-rose-200',
  unknown: 'bg-[var(--wp-color-surface-elevated)]/80 text-[var(--wp-color-text)]',
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
    department.assets.forEach((asset: HierarchyAsset) => pushAsset(asset, department.name));
    department.lines.forEach((line) => {
      line.assets.forEach((asset: HierarchyAsset) => pushAsset(asset, `${line.name}`));
      line.stations.forEach((station) => {
        station.assets.forEach((asset: HierarchyAsset) => pushAsset(asset, `${station.name}`));
      });
    });
  });
  return options.sort((a, b) => a.label.localeCompare(b.label));
};

const IotMonitoring = () => {
  const [assetFilter, setAssetFilter] = useState<'all' | string>('all');
  const [metricFilter, setMetricFilter] = useState<'all' | string>('all');
  const [meterFilter, setMeterFilter] = useState<string>('');
  const [meterValue, setMeterValue] = useState('');
  const [meterSubmitting, setMeterSubmitting] = useState(false);
  const { data: hierarchy } = useHierarchyTree();

  const assetOptions = useMemo(() => flattenAssetOptions(hierarchy), [hierarchy]);
  const assetNameMap = useMemo(
    () => new Map(assetOptions.map((option) => [option.value, option.label])),
    [assetOptions],
  );

  const signalsQuery = useQuery(
    ['iot-signals', assetFilter, metricFilter],
    () => {
      const params: IoTSignalQuery = { limit: 150 };
      if (assetFilter !== 'all') {
        params.assetId = assetFilter;
      }
      if (metricFilter !== 'all') {
        params.metric = metricFilter;
      }
      return fetchIotSignals(params);
    },
    { keepPreviousData: true, staleTime: 30_000 },
  );

  const alertsQuery = useQuery(['iot-alerts'], () => fetchIotAlerts(50), {
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  const metersQuery = useQuery(['meters', assetFilter], () => fetchMeters(assetFilter === 'all' ? undefined : assetFilter), {
    staleTime: 60_000,
  });

  const devicesQuery = useQuery(
    ['iot-devices', assetFilter],
    () => fetchSensorDevices(assetFilter === 'all' ? undefined : assetFilter),
    { staleTime: 30_000 },
  );

  const rulesQuery = useQuery(['condition-rules'], () => fetchConditionRules(), {
    staleTime: 60_000,
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

  const meterOptions = useMemo(() => {
    return (metersQuery.data ?? []).map((meter: Meter) => ({
      value: meter.id,
      label: `${meter.name} (${meter.unit})`,
    }));
  }, [metersQuery.data]);

  const devices = devicesQuery.data ?? [];
  const rules = rulesQuery.data ?? [];

  const deriveStatus = (device: SensorDevice): SensorDevice['status'] => {
    if (device.lastSeenAt) {
      const minutes = Math.floor((Date.now() - new Date(device.lastSeenAt).getTime()) / 60000);
      if (minutes > 30) return 'offline';
      return 'online';
    }
    return device.status ?? 'unknown';
  };

  const summary = {
    telemetryCount: signals.reduce((sum, series) => sum + series.points.length, 0),
    trendingUp: signals.filter((series) => (series.change ?? 0) > 0).length,
    alertCount: alertsQuery.data?.length ?? 0,
    onlineDevices: devices.filter((device) => deriveStatus(device) === 'online').length,
  };

  const submitMeterReading = async () => {
    const value = Number.parseFloat(meterValue);
    if (!meterFilter || Number.isNaN(value)) {
      emitToast('Select a meter and enter a reading value.', 'error');
      return;
    }

    setMeterSubmitting(true);
    if (!navigator.onLine) {
      enqueueMeterReading(meterFilter, value);
      emitToast('Reading queued and will sync when back online.', 'success');
      setMeterValue('');
      setMeterSubmitting(false);
      return;
    }

    try {
      await addMeterReading(meterFilter, value);
      emitToast('Meter reading recorded.');
      setMeterValue('');
      await syncManager.sync();
    } catch (err) {
      console.error(err);
      enqueueMeterReading(meterFilter, value);
      emitToast('Unable to send reading now; queued for sync.', 'error');
    } finally {
      setMeterSubmitting(false);
    }
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
        className="bg-[color-mix(in_srgb,var(--wp-color-surface)_82%,transparent)]"
      >
        <div className="mb-4 flex flex-wrap items-center gap-4 text-sm text-[var(--wp-color-text-muted)]">
          <div>
            <p className="text-xs uppercase tracking-wide text-[var(--wp-color-text-muted)]">Latest value</p>
            <p className="text-xl font-semibold text-[var(--wp-color-text)]">{formatValue(series.latestValue)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-[var(--wp-color-text-muted)]">Change</p>
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
          <h1 className="text-3xl font-semibold text-[var(--wp-color-text)]">IoT Monitoring</h1>
          <p className="text-sm text-[var(--wp-color-text-muted)]">
            Observe live telemetry from connected assets and review automated alert history.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-[var(--wp-color-text-muted)]">
            Asset
            <select
              value={assetFilter}
              onChange={(event) => setAssetFilter(event.target.value)}
              className="rounded-lg border border-[var(--wp-color-border)] bg-[var(--wp-color-surface)] px-3 py-2 text-sm text-[var(--wp-color-text)] focus:border-primary-500 focus:outline-none"
            >
              <option value="all">All assets</option>
              {assetOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-[var(--wp-color-text-muted)]">
            Metric
            <select
              value={metricFilter}
              onChange={(event) => setMetricFilter(event.target.value)}
              className="rounded-lg border border-[var(--wp-color-border)] bg-[var(--wp-color-surface)] px-3 py-2 text-sm text-[var(--wp-color-text)] focus:border-primary-500 focus:outline-none"
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

      <Card title="Log meter reading" className="bg-[color-mix(in_srgb,var(--wp-color-surface)_82%,transparent)]">
        <div className="grid gap-3 md:grid-cols-[2fr,1fr,auto] md:items-end">
          <label className="flex flex-col gap-1 text-sm text-[var(--wp-color-text)]">
            Meter
            <select
              className="rounded-md border border-[var(--wp-color-border)] bg-[var(--wp-color-surface)] px-3 py-2 text-sm text-[var(--wp-color-text)]"
              value={meterFilter}
              onChange={(event) => setMeterFilter(event.target.value)}
            >
              <option value="">Select a meter</option>
              {meterOptions.map((meter) => (
                <option key={meter.value} value={meter.value}>
                  {meter.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm text-[var(--wp-color-text)]">
            Reading value
            <input
              type="number"
              className="rounded-md border border-[var(--wp-color-border)] bg-[var(--wp-color-surface)] px-3 py-2 text-sm text-[var(--wp-color-text)]"
              placeholder="0"
              value={meterValue}
              onChange={(event) => setMeterValue(event.target.value)}
            />
          </label>
          <button
            className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-[var(--wp-color-text)] transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => void submitMeterReading()}
            disabled={meterSubmitting}
          >
            {meterSubmitting ? 'Saving…' : 'Save reading'}
          </button>
        </div>
        <p className="mt-2 text-xs text-[var(--wp-color-text-muted)]">
          Offline? Readings are stored locally and automatically synced when connectivity returns.
        </p>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-[var(--wp-color-border)] bg-[color-mix(in_srgb,var(--wp-color-surface)_75%,transparent)] p-5">
          <div className="flex items-center gap-3 text-sm text-[var(--wp-color-text-muted)]">
            <span className="rounded-lg bg-primary-500/20 p-2 text-primary-300">
              <Activity className="h-5 w-5" />
            </span>
            Signals ingested
          </div>
          <p className="mt-3 text-3xl font-semibold text-[var(--wp-color-text)]">{summary.telemetryCount}</p>
          <p className="text-xs text-[var(--wp-color-text-muted)]">Last fetch window</p>
        </div>
        <div className="rounded-xl border border-[var(--wp-color-border)] bg-[color-mix(in_srgb,var(--wp-color-surface)_75%,transparent)] p-5">
          <div className="flex items-center gap-3 text-sm text-[var(--wp-color-text-muted)]">
            <span className="rounded-lg bg-emerald-500/20 p-2 text-emerald-300">
              <RefreshCcw className="h-5 w-5" />
            </span>
            Metrics trending upward
          </div>
          <p className="mt-3 text-3xl font-semibold text-[var(--wp-color-text)]">{summary.trendingUp}</p>
          <p className="text-xs text-[var(--wp-color-text-muted)]">Based on last data point</p>
        </div>
        <div className="rounded-xl border border-[var(--wp-color-border)] bg-[color-mix(in_srgb,var(--wp-color-surface)_75%,transparent)] p-5">
          <div className="flex items-center gap-3 text-sm text-[var(--wp-color-text-muted)]">
            <span className="rounded-lg bg-rose-500/20 p-2 text-rose-200">
              <AlertTriangle className="h-5 w-5" />
            </span>
            IoT alerts (30 min)
          </div>
          <p className="mt-3 text-3xl font-semibold text-[var(--wp-color-text)]">{summary.alertCount}</p>
          <p className="text-xs text-[var(--wp-color-text-muted)]">Auto-generated actions</p>
        </div>
        <div className="rounded-xl border border-[var(--wp-color-border)] bg-[color-mix(in_srgb,var(--wp-color-surface)_75%,transparent)] p-5">
          <div className="flex items-center gap-3 text-sm text-[var(--wp-color-text-muted)]">
            <span className="rounded-lg bg-emerald-500/20 p-2 text-emerald-200">
              <Radio className="h-5 w-5" />
            </span>
            Online sensors
          </div>
          <p className="mt-3 text-3xl font-semibold text-[var(--wp-color-text)]">{summary.onlineDevices}</p>
          <p className="text-xs text-[var(--wp-color-text-muted)]">Device registry health</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card
          title="Sensor registry"
          subtitle="Registered devices mapped to assets"
          className="bg-[color-mix(in_srgb,var(--wp-color-surface)_82%,transparent)]"
        >
          {devicesQuery.isLoading ? (
            <p className="text-sm text-[var(--wp-color-text-muted)]">Loading devices…</p>
          ) : devices.length === 0 ? (
            <p className="text-sm text-[var(--wp-color-text-muted)]">No devices registered for this scope.</p>
          ) : (
            <div className="overflow-x-auto text-sm">
              <table className="w-full min-w-[520px]">
                <thead className="border-b border-[var(--wp-color-border)] text-xs uppercase tracking-wide text-[var(--wp-color-text-muted)]">
                  <tr>
                    <th className="py-2 text-left">Device</th>
                    <th className="py-2 text-left">Asset</th>
                    <th className="py-2 text-left">Last reading</th>
                    <th className="py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {devices.map((device) => {
                    const status = deriveStatus(device);
                    return (
                      <tr key={device._id} className="border-b border-[var(--wp-color-border)]/60 text-[var(--wp-color-text)]">
                        <td className="py-2 font-medium text-[var(--wp-color-text)]">
                          <div className="flex flex-col">
                            <span>{device.name ?? device.deviceId}</span>
                            <span className="text-xs text-[var(--wp-color-text-muted)]">{device.deviceId}</span>
                          </div>
                        </td>
                        <td className="py-2 text-[var(--wp-color-text-muted)]">{assetNameMap.get(device.asset) ?? '—'}</td>
                        <td className="py-2 text-[var(--wp-color-text-muted)]">
                          {device.lastMetric ? (
                            <div className="flex flex-col">
                              <span className="font-medium text-[var(--wp-color-text)]">
                                {device.lastMetric}: {formatValue(device.lastValue)}
                              </span>
                              <span className="text-xs text-[var(--wp-color-text-muted)]">{formatRelativeTime(device.lastSeenAt)}</span>
                            </div>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="py-2">
                          <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusClasses[status]}`}>
                            {status === 'online' ? 'Online' : status === 'offline' ? 'Offline' : 'Unknown'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card
          title="Automation rules"
          subtitle="Thresholds that auto-generate work orders and alerts"
          className="bg-[color-mix(in_srgb,var(--wp-color-surface)_82%,transparent)]"
          headerActions={
            <div className="inline-flex items-center gap-2 rounded-full bg-[var(--wp-color-surface-elevated)]/80 px-3 py-1 text-xs text-[var(--wp-color-text-muted)]">
              <ScrollText className="h-4 w-4 text-primary-300" />
              {rules.length} rules configured
            </div>
          }
        >
          {rulesQuery.isLoading ? (
            <p className="text-sm text-[var(--wp-color-text-muted)]">Loading rules…</p>
          ) : rules.length === 0 ? (
            <p className="text-sm text-[var(--wp-color-text-muted)]">No condition rules found yet.</p>
          ) : (
            <ul className="divide-y divide-slate-800 text-sm">
              {rules.map((rule) => (
                <li key={rule._id} className="py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[var(--wp-color-text)]">
                        {assetNameMap.get(rule.asset) ?? 'Asset'} • {rule.metric} {rule.operator} {rule.threshold}
                      </p>
                      <p className="text-xs text-[var(--wp-color-text-muted)]">{rule.workOrderTitle}</p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${rule.active ? 'bg-emerald-900/40 text-emerald-200' : 'bg-[var(--wp-color-surface-elevated)] text-[var(--wp-color-text-muted)]'
                        }`}
                    >
                      {rule.active ? 'Active' : 'Paused'}
                    </span>
                  </div>
                  {rule.workOrderDescription && (
                    <p className="mt-1 text-xs text-[var(--wp-color-text-muted)]">{rule.workOrderDescription}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {signalsQuery.isLoading && (
          <Card title="Telemetry" className="lg:col-span-2">
            <p className="text-sm text-[var(--wp-color-text-muted)]">Loading telemetry...</p>
          </Card>
        )}
        {!signalsQuery.isLoading && signals.length === 0 && (
          <Card title="Telemetry" className="lg:col-span-2">
            <p className="text-sm text-[var(--wp-color-text-muted)]">No telemetry found for the selected filters.</p>
          </Card>
        )}
        {!signalsQuery.isLoading && signals.map((series) => renderSignalCard(series))}
      </div>

      <Card title="Alert history" subtitle="Most recent IoT-driven events" className="overflow-hidden">
        {alertsQuery.isLoading ? (
          <p className="text-sm text-[var(--wp-color-text-muted)]">Loading alerts…</p>
        ) : alerts.length === 0 ? (
          <p className="text-sm text-[var(--wp-color-text-muted)]">No IoT alerts have been generated yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--wp-color-border)] text-xs uppercase tracking-wide text-[var(--wp-color-text-muted)]">
                  <th className="py-3">Alert</th>
                  <th>Asset</th>
                  <th>Metric</th>
                  <th>Level</th>
                  <th>Detected</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((alert) => (
                  <tr key={alert._id} className="border-b border-[var(--wp-color-border)]/60 text-[var(--wp-color-text)]">
                    <td className="py-3 text-[var(--wp-color-text)]">{alert.message}</td>
                    <td className="py-3 text-[var(--wp-color-text-muted)]">{alert.assetName ?? alert.asset ?? '—'}</td>
                    <td className="py-3 text-[var(--wp-color-text-muted)]">{alert.metric ?? '—'}</td>
                    <td className="py-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${levelClasses[alert.level]}`}>
                        {levelLabel[alert.level]}
                      </span>
                    </td>
                    <td className="py-3 text-[var(--wp-color-text-muted)]">
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

