/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useMemo, useState } from 'react';
import { Download, RefreshCcw } from 'lucide-react';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import Input from '@/components/common/Input';
import {
  exportMetricsRollupCsv,
  exportMetricsRollupPdf,
  fetchMetricsRollupDetails,
  fetchMetricsRollups,
  type MetricsRollupBreakdownRow,
  type MetricsRollupDetailRow,
  type MetricsRollupFilters,
  type MetricsRollupSummaryResponse,
} from '@/api/analyticsWarehouse';

const RANGE_OPTIONS = [
  { label: 'Last 7 days', value: 7 },
  { label: 'Last 30 days', value: 30 },
  { label: 'Last 90 days', value: 90 },
];

const formatNumber = (value: number, maximumFractionDigits = 1) =>
  value.toLocaleString(undefined, { maximumFractionDigits });

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const deriveParams = (
  rangeDays: number,
  granularity: 'day' | 'month',
  siteId: string,
  lineId: string,
  assetId: string,
): MetricsRollupFilters => {
  const end = new Date();
  const start = new Date(end.getTime() - rangeDays * 24 * 60 * 60 * 1000);
  const params: MetricsRollupFilters = {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    granularity,
  };
  if (siteId !== 'all') params.siteIds = [siteId];
  if (lineId !== 'all') params.lineIds = [lineId];
  if (assetId !== 'all') params.assetIds = [assetId];
  return params;
};

const renderMetricCard = (title: string, value: string, subtitle?: string) => (
  <Card className="space-y-1 border border-neutral-200 shadow-sm">
    <p className="text-xs font-semibold uppercase tracking-wide text-primary-600">{title}</p>
    <p className="text-2xl font-semibold text-neutral-900">{value}</p>
    {subtitle ? <p className="text-xs text-neutral-500">{subtitle}</p> : null}
  </Card>
);

const toHours = (minutes: number) => minutes / 60;

const BreakdownTable = ({ rows }: { rows: MetricsRollupBreakdownRow[] }) => (
  <div className="overflow-x-auto">
    <table className="min-w-full text-left text-sm text-neutral-700">
      <thead>
        <tr className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500">
          <th className="px-3 py-2">Scope</th>
          <th className="px-3 py-2">MTTR (h)</th>
          <th className="px-3 py-2">MTBF (h)</th>
          <th className="px-3 py-2">PM compliance</th>
          <th className="px-3 py-2">Downtime (h)</th>
          <th className="px-3 py-2">Completed / WO</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={`${row.scope}-${row.id ?? 'all'}`} className="border-b border-neutral-100">
            <td className="px-3 py-2 font-medium text-neutral-900">
              {row.scope.toUpperCase()} • {row.name ?? row.id ?? 'Unassigned'}
            </td>
            <td className="px-3 py-2">{formatNumber(row.mttrHours, 2)}</td>
            <td className="px-3 py-2">{formatNumber(row.mtbfHours, 2)}</td>
            <td className="px-3 py-2">{formatNumber(row.pmCompliance, 1)}%</td>
            <td className="px-3 py-2">{formatNumber(toHours(row.downtimeMinutes), 2)}</td>
            <td className="px-3 py-2">{row.completedWorkOrders}/{row.workOrders}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const DrillDownList = ({ workOrders }: { workOrders: MetricsRollupDetailRow[] }) => (
  <div className="divide-y divide-neutral-200">
    {workOrders.map((order) => (
      <div key={order.id} className="py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-neutral-900">{order.title}</p>
            <p className="text-xs text-neutral-500">
              {order.type.toUpperCase()} • {order.status} • {order.priority ?? 'unspecified'}
            </p>
          </div>
          <div className="text-right text-xs text-neutral-500">
            {order.completedAt ? `Completed ${new Date(order.completedAt).toLocaleDateString()}` : 'Open'}
          </div>
        </div>
        <div className="mt-2 grid gap-3 text-xs text-neutral-600 sm:grid-cols-3">
          <p>Asset: {order.assetName ?? order.assetId ?? 'n/a'}</p>
          <p>Line: {order.lineName ?? order.lineId ?? 'n/a'}</p>
          <p>Site: {order.siteName ?? order.siteId ?? 'n/a'}</p>
          <p>PM task: {order.pmTaskTitle ?? order.pmTaskId ?? 'n/a'}</p>
          <p>Downtime: {order.downtimeMinutes ? `${formatNumber(order.downtimeMinutes)} min` : 'n/a'}</p>
          <p>Wrench time: {order.timeSpentMinutes ? `${formatNumber(order.timeSpentMinutes)} min` : 'n/a'}</p>
        </div>
      </div>
    ))}
  </div>
);

export default function AnalyticsDashboardV2() {
  const [rangeDays, setRangeDays] = useState<number>(30);
  const [granularity, setGranularity] = useState<'day' | 'month'>('day');
  const [siteId, setSiteId] = useState('all');
  const [lineId, setLineId] = useState('all');
  const [assetId, setAssetId] = useState('all');
  const [summary, setSummary] = useState<MetricsRollupSummaryResponse | null>(null);
  const [details, setDetails] = useState<MetricsRollupDetailRow[]>([]);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const params = useMemo(
    () => deriveParams(rangeDays, granularity, siteId, lineId, assetId),
    [rangeDays, granularity, siteId, lineId, assetId],
  );

  const loadSummary = async () => {
    setLoadingSummary(true);
    setError(null);
    try {
      const data = await fetchMetricsRollups(params);
      setSummary(data);
    } catch (err) {
      console.error('Failed to load metrics rollups', err);
      setError('Unable to load rollups');
    } finally {
      setLoadingSummary(false);
    }
  };

  const loadDetails = async () => {
    setLoadingDetails(true);
    try {
      const data = await fetchMetricsRollupDetails(params);
      setDetails(data.workOrders);
    } catch (err) {
      console.error('Failed to load drill-down work orders', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    loadSummary();
    loadDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.startDate, params.endDate, params.granularity, siteId, lineId, assetId]);

  const handleExport = async (type: 'csv' | 'pdf') => {
    setExporting(true);
    try {
      const blob = type === 'csv' ? await exportMetricsRollupCsv(params) : await exportMetricsRollupPdf(params);
      downloadBlob(blob, `metrics-rollups.${type}`);
    } finally {
      setExporting(false);
    }
  };

  const totalsRow = summary?.totals;
  const breakdownRows: MetricsRollupBreakdownRow[] = summary
    ? [{ ...summary.totals, name: 'Totals', scope: 'tenant', id: 'all' }, ...summary.breakdown]
    : [];

  const filterOptions = summary?.availableFilters ?? { sites: [], lines: [], assets: [] };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Reliability rollups</h1>
          <p className="text-sm text-neutral-500">
            MTTR, MTBF, PM compliance, and downtime rolled up by tenant, site, line, and asset with drill-downs.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => handleExport('csv')} loading={exporting} icon={<Download className="h-4 w-4" />}
            iconPosition="left">
            Export CSV
          </Button>
          <Button onClick={() => handleExport('pdf')} loading={exporting} variant="secondary" icon={<Download className="h-4 w-4" />}
            iconPosition="left">
            Export PDF
          </Button>
          <Button onClick={() => { loadSummary(); loadDetails(); }} variant="ghost" icon={<RefreshCcw className="h-4 w-4" />}>
            Refresh
          </Button>
        </div>
      </header>

      <Card className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-neutral-600">Range</label>
            <select
              className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
              value={rangeDays}
              onChange={(event) => setRangeDays(Number(event.target.value))}
            >
              {RANGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-neutral-600">Granularity</label>
            <select
              className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
              value={granularity}
              onChange={(event) => setGranularity(event.target.value as 'day' | 'month')}
            >
              <option value="day">Daily</option>
              <option value="month">Monthly</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-neutral-600">Site</label>
            <select
              className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
              value={siteId}
              onChange={(event) => setSiteId(event.target.value)}
            >
              <option value="all">All sites</option>
              {filterOptions.sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name ?? site.id}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-neutral-600">Line</label>
            <select
              className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
              value={lineId}
              onChange={(event) => setLineId(event.target.value)}
            >
              <option value="all">All lines</option>
              {filterOptions.lines.map((line) => (
                <option key={line.id} value={line.id}>
                  {line.name ?? line.id}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2 md:col-span-2 lg:col-span-4 xl:col-span-2">
            <label className="text-xs font-semibold text-neutral-600">Asset</label>
            <select
              className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
              value={assetId}
              onChange={(event) => setAssetId(event.target.value)}
            >
              <option value="all">All assets</option>
              {filterOptions.assets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.name ?? asset.id}
                </option>
              ))}
            </select>
          </div>
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {totalsRow
          ? [
              renderMetricCard('MTTR', `${formatNumber(totalsRow.mttrHours, 2)} h`, 'Mean time to repair'),
              renderMetricCard('MTBF', `${formatNumber(totalsRow.mtbfHours, 2)} h`, 'Mean time between failure'),
              renderMetricCard(
                'PM compliance',
                `${formatNumber(totalsRow.pmCompliance, 1)} %`,
                `${totalsRow.pmCompleted}/${totalsRow.pmTotal} completed`,
              ),
              renderMetricCard('Downtime', `${formatNumber(toHours(totalsRow.downtimeMinutes), 2)} h`),
              renderMetricCard('Completed work orders', `${totalsRow.completedWorkOrders}/${totalsRow.workOrders}`),
              renderMetricCard('Range', `${params.startDate?.slice(0, 10)} → ${params.endDate?.slice(0, 10)}`),
            ]
            : Array.from({ length: 3 }).map((_, index) => (
              <Card key={index} className="h-24 animate-pulse bg-neutral-50">
                <div className="h-full" />
              </Card>
            ))}
      </div>

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">Breakdown by asset / line / site</h2>
            <p className="text-sm text-neutral-500">
              Sorted by downtime to highlight bottlenecks across the hierarchy.
            </p>
          </div>
          {loadingSummary ? <span className="text-sm text-neutral-500">Loading…</span> : null}
        </div>
        {breakdownRows.length ? <BreakdownTable rows={breakdownRows} /> : <p className="text-sm text-neutral-500">No rollups available for this range.</p>}
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">Drill-down to work orders & PMs</h2>
            <p className="text-sm text-neutral-500">Open the trail of work orders backing each rollup.</p>
          </div>
          {loadingDetails ? <span className="text-sm text-neutral-500">Loading…</span> : null}
        </div>
        {details.length ? <DrillDownList workOrders={details} /> : <p className="text-sm text-neutral-500">No matching work orders found.</p>}
      </Card>

      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">Manual overrides</h2>
            <p className="text-sm text-neutral-500">Align numbers with other dashboards when needed.</p>
          </div>
          <Button onClick={loadSummary} disabled={loadingSummary}>
            Apply overrides
          </Button>
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <Input
            label="Custom MTTR (hours)"
            type="number"
            value={totalsRow?.mttrHours ?? 0}
            onChange={(event) =>
              setSummary((prev) =>
                prev
                  ? {
                      ...prev,
                      totals: { ...prev.totals, mttrHours: Number(event.target.value) },
                    }
                  : prev,
              )
            }
          />
          <Input
            label="Custom MTBF (hours)"
            type="number"
            value={totalsRow?.mtbfHours ?? 0}
            onChange={(event) =>
              setSummary((prev) =>
                prev
                  ? {
                      ...prev,
                      totals: { ...prev.totals, mtbfHours: Number(event.target.value) },
                    }
                  : prev,
              )
            }
          />
          <Input
            label="Custom PM compliance (%)"
            type="number"
            value={totalsRow?.pmCompliance ?? 0}
            onChange={(event) =>
              setSummary((prev) =>
                prev
                  ? {
                      ...prev,
                      totals: { ...prev.totals, pmCompliance: Number(event.target.value) },
                    }
                  : prev,
              )
            }
          />
        </div>
      </Card>
    </div>
  );
}
