/*
 * SPDX-License-Identifier: MIT
 */

import React from 'react';

import { ComparisonGrid } from './ComparisonGrid';
import { ExportMenu } from './ExportMenu';
import { LeaderboardPanel } from './LeaderboardPanel';
import { TrendsBoard } from './TrendsBoard';
import {
  fetchSnapshots,
  fetchLeaderboards,
  fetchComparisons,
  fetchReliabilityByAsset,
  fetchBacklogBurndown,
  fetchPmComplianceTrend,
  exportReliabilitySnapshot,
  exportBacklogBurndown,
  exportPmComplianceTrend,
  type Snapshot,
  type LeaderboardResponse,
  type ComparisonResponse,
  type ReliabilityByAssetPoint,
  type BacklogBurndownPoint,
  type PmComplianceTrendPoint,
} from '@/api/analyticsWarehouse';
import { SimpleBarChart } from '@/components/charts/SimpleBarChart';
import { SimpleLineChart } from '@/components/charts/SimpleLineChart';

interface Filters {
  granularity: 'day' | 'month';
  scope?: 'site' | 'asset' | 'technician' | 'overall';
}

const defaultFilters: Filters = { granularity: 'month', scope: 'site' };

export const WarehouseDashboard: React.FC = () => {
  const [filters, setFilters] = React.useState<Filters>(defaultFilters);
  const [windowDays, setWindowDays] = React.useState<number>(90);
  const [windowEnd, setWindowEnd] = React.useState<string>(() => new Date().toISOString().slice(0, 10));
  const [snapshots, setSnapshots] = React.useState<Snapshot[]>([]);
  const [leaderboard, setLeaderboard] = React.useState<LeaderboardResponse>();
  const [comparisons, setComparisons] = React.useState<ComparisonResponse>();
  const [reliabilityByAsset, setReliabilityByAsset] = React.useState<ReliabilityByAssetPoint[]>([]);
  const [backlogBurndown, setBacklogBurndown] = React.useState<BacklogBurndownPoint[]>([]);
  const [pmTrend, setPmTrend] = React.useState<PmComplianceTrendPoint[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [chartsLoading, setChartsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [exporting, setExporting] = React.useState<'reliability' | 'backlog' | 'pm' | null>(null);

  const windowParams = React.useMemo(() => {
    const end = new Date(windowEnd);
    const start = new Date(end);
    start.setDate(end.getDate() - windowDays + 1);
    return {
      from: start.toISOString(),
      to: end.toISOString(),
    };
  }, [windowDays, windowEnd]);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [snapRes, leaderRes, comparisonRes] = await Promise.all([
        fetchSnapshots({ ...filters, ...windowParams }),
        fetchLeaderboards(filters),
        fetchComparisons({ ...filters, scope: 'site', ...windowParams }),
      ]);
      setSnapshots(snapRes.snapshots);
      setLeaderboard(leaderRes);
      setComparisons(comparisonRes);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [filters, windowParams]);

  const loadCharts = React.useCallback(async () => {
    setChartsLoading(true);
    try {
      const [reliability, backlog, compliance] = await Promise.all([
        fetchReliabilityByAsset({ ...filters, ...windowParams, scope: 'asset' }),
        fetchBacklogBurndown({ ...filters, ...windowParams }),
        fetchPmComplianceTrend({ ...filters, ...windowParams }),
      ]);
      setReliabilityByAsset(reliability);
      setBacklogBurndown(backlog);
      setPmTrend(compliance);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setChartsLoading(false);
    }
  }, [filters, windowParams]);

  React.useEffect(() => {
    loadData();
    loadCharts();
  }, [loadData, loadCharts]);

  const onGranularityChange = (granularity: Filters['granularity']) => {
    setFilters((prev) => ({ ...prev, granularity }));
  };

  const reliabilityData = React.useMemo(
    () =>
      reliabilityByAsset.slice(0, 8).map((row) => ({
        label: row.assetName || row.assetId || 'Unassigned',
        value: Number(row.mttrHours.toFixed(2)),
      })),
    [reliabilityByAsset],
  );

  const mtbfData = React.useMemo(
    () =>
      reliabilityByAsset.slice(0, 8).map((row) => ({
        label: row.assetName || row.assetId || 'Unassigned',
        value: Number(row.mtbfHours.toFixed(2)),
      })),
    [reliabilityByAsset],
  );

  const burnDownData = React.useMemo(
    () => backlogBurndown.map((point) => ({ label: point.period.slice(0, 10), value: point.open })),
    [backlogBurndown],
  );

  const pmTrendData = React.useMemo(
    () => pmTrend.map((point) => ({ label: point.period.slice(0, 10), value: Number(point.compliance.toFixed(1)) })),
    [pmTrend],
  );

  const handleExport = async (type: 'reliability' | 'backlog' | 'pm') => {
    setExporting(type);
    try {
      const blob =
        type === 'reliability'
          ? await exportReliabilitySnapshot({ ...filters, ...windowParams })
          : type === 'backlog'
            ? await exportBacklogBurndown({ ...filters, ...windowParams })
            : await exportPmComplianceTrend({ ...filters, ...windowParams });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${type}-snapshot.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(null);
    }
  };

  const leaderboardsFlattened = React.useMemo(
    () => [...(leaderboard?.sites ?? []), ...(leaderboard?.assets ?? []), ...(leaderboard?.technicians ?? [])],
    [leaderboard],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Analytics warehouse</p>
          <h2 className="text-2xl font-bold text-slate-800">Operational performance</h2>
          <p className="text-sm text-slate-600">MTBF/MTTR, SLA response and resolution, technician utilization, and cost KPIs across every dimension.</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onGranularityChange('day')}
            className={`rounded border px-3 py-1 text-sm ${filters.granularity === 'day' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-700'}`}
          >
            Daily
          </button>
          <button
            type="button"
            onClick={() => onGranularityChange('month')}
            className={`rounded border px-3 py-1 text-sm ${filters.granularity === 'month' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-700'}`}
          >
            Monthly
          </button>
          <select
            aria-label="Trend window"
            value={windowDays}
            onChange={(event) => setWindowDays(Number(event.target.value))}
            className="rounded border border-slate-200 px-3 py-1 text-sm text-slate-700"
          >
            <option value={30}>30 days</option>
            <option value={90}>90 days</option>
            <option value={180}>180 days</option>
          </select>
          <input
            type="date"
            aria-label="Window end date"
            value={windowEnd}
            onChange={(event) => setWindowEnd(event.target.value)}
            className="rounded border border-slate-200 px-3 py-1 text-sm text-slate-700"
          />
          <button
            type="button"
            onClick={() => {
              loadData();
              loadCharts();
            }}
            className="rounded border border-slate-200 px-3 py-1 text-sm text-slate-700"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {loading && <div className="rounded border border-slate-200 bg-white p-3 text-sm text-slate-600">Loading analytics...</div>}

      {!loading && (
        <>
          <ExportMenu
            snapshots={snapshots}
            leaderboards={leaderboardsFlattened}
            comparisons={comparisons?.comparisons ?? []}
          />

          <div className="grid gap-4 lg:grid-cols-3">
            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <header className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">MTTR by asset</p>
                  <h3 className="text-lg font-semibold text-slate-800">Repair duration focus</h3>
                </div>
                {chartsLoading && <span className="text-xs text-slate-500">Loading…</span>}
              </header>
              <div className="h-48">
                {reliabilityData.length ? (
                  <SimpleBarChart data={reliabilityData} className="h-full" />
                ) : (
                  <p className="text-sm text-slate-500">No MTTR data in window.</p>
                )}
              </div>
              <button
                type="button"
                className="mt-3 text-sm font-semibold text-blue-700"
                onClick={() => handleExport('reliability')}
                disabled={exporting === 'reliability'}
              >
                {exporting === 'reliability' ? 'Exporting…' : 'Download reliability snapshot'}
              </button>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <header className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">MTBF by asset</p>
                  <h3 className="text-lg font-semibold text-slate-800">Failure spacing</h3>
                </div>
                {chartsLoading && <span className="text-xs text-slate-500">Loading…</span>}
              </header>
              <div className="h-48">
                {mtbfData.length ? (
                  <SimpleBarChart data={mtbfData} className="h-full" />
                ) : (
                  <p className="text-sm text-slate-500">No MTBF data in window.</p>
                )}
              </div>
              <button
                type="button"
                className="mt-3 text-sm font-semibold text-blue-700"
                onClick={() => handleExport('reliability')}
                disabled={exporting === 'reliability'}
              >
                {exporting === 'reliability' ? 'Exporting…' : 'Download reliability snapshot'}
              </button>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <header className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Backlog burn-down</p>
                  <h3 className="text-lg font-semibold text-slate-800">Open work aging</h3>
                </div>
                {chartsLoading && <span className="text-xs text-slate-500">Loading…</span>}
              </header>
              <div className="h-48">
                {burnDownData.length ? (
                  <SimpleLineChart data={burnDownData} className="h-full" />
                ) : (
                  <p className="text-sm text-slate-500">No backlog samples in range.</p>
                )}
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Avg aging: {backlogBurndown.length
                  ? `${(
                      backlogBurndown.reduce((acc, cur) => acc + cur.agingDays, 0) / backlogBurndown.length
                    ).toFixed(1)} days`
                  : 'n/a'}
              </p>
              <button
                type="button"
                className="mt-3 text-sm font-semibold text-blue-700"
                onClick={() => handleExport('backlog')}
                disabled={exporting === 'backlog'}
              >
                {exporting === 'backlog' ? 'Exporting…' : 'Download backlog snapshot'}
              </button>
            </section>
          </div>

          <TrendsBoard snapshots={snapshots} />

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <header className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">PM compliance</p>
                <h3 className="text-lg font-semibold text-slate-800">Completion trend</h3>
              </div>
              {chartsLoading && <span className="text-xs text-slate-500">Loading…</span>}
            </header>
            <div className="h-48">
              {pmTrendData.length ? (
                <SimpleLineChart data={pmTrendData} className="h-full" stroke="#16a34a" showDots />
              ) : (
                <p className="text-sm text-slate-500">No PM compliance records yet.</p>
              )}
            </div>
            <button
              type="button"
              className="mt-3 text-sm font-semibold text-blue-700"
              onClick={() => handleExport('pm')}
              disabled={exporting === 'pm'}
            >
              {exporting === 'pm' ? 'Exporting…' : 'Download PM trend snapshot'}
            </button>
          </section>

          {leaderboard && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              <LeaderboardPanel title="Sites with highest downtime" entries={leaderboard.sites} accent="amber" />
              <LeaderboardPanel title="Assets requiring attention" entries={leaderboard.assets} accent="blue" />
              <LeaderboardPanel title="Technician utilization" entries={leaderboard.technicians} accent="emerald" />
            </div>
          )}

          {comparisons && <ComparisonGrid rows={comparisons.comparisons} />}
        </>
      )}
    </div>
  );
};
