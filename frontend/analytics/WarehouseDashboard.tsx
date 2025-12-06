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
  type Snapshot,
  type LeaderboardResponse,
  type ComparisonResponse,
} from '@/api/analyticsWarehouse';

interface Filters {
  granularity: 'day' | 'month';
  scope?: 'site' | 'asset' | 'technician' | 'overall';
}

const defaultFilters: Filters = { granularity: 'month', scope: 'site' };

export const WarehouseDashboard: React.FC = () => {
  const [filters, setFilters] = React.useState<Filters>(defaultFilters);
  const [snapshots, setSnapshots] = React.useState<Snapshot[]>([]);
  const [leaderboard, setLeaderboard] = React.useState<LeaderboardResponse>();
  const [comparisons, setComparisons] = React.useState<ComparisonResponse>();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [snapRes, leaderRes, comparisonRes] = await Promise.all([
        fetchSnapshots(filters),
        fetchLeaderboards(filters),
        fetchComparisons({ ...filters, scope: 'site' }),
      ]);
      setSnapshots(snapRes.snapshots);
      setLeaderboard(leaderRes);
      setComparisons(comparisonRes);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const onGranularityChange = (granularity: Filters['granularity']) => {
    setFilters((prev) => ({ ...prev, granularity }));
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

          <TrendsBoard snapshots={snapshots} />

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
