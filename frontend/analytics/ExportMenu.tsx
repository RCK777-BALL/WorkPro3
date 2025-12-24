/*
 * SPDX-License-Identifier: MIT
 */

import React from 'react';
import type { Snapshot, LeaderboardEntry, ComparisonRow } from '@/api/analyticsWarehouse';

interface Props {
  snapshots: Snapshot[];
  leaderboards: LeaderboardEntry[];
  comparisons: ComparisonRow[];
}

const download = (filename: string, content: string) => {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

const toCsv = (rows: unknown[]) => {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0] as Record<string, unknown>);
  const escape = (value: unknown) => {
    if (value == null) return '';
    const str = String(value).replace(/"/g, '""');
    return /[,"]/.test(str) ? `"${str}"` : str;
  };
  const lines = [headers.join(',')];
  rows.forEach((row) => {
    const r = row as Record<string, unknown>;
    lines.push(headers.map((header) => escape(r[header])).join(','));
  });
  return lines.join('\n');
};

export const ExportMenu: React.FC<Props> = ({ snapshots, leaderboards, comparisons }) => {
  const onExportSnapshots = () => {
    const rows = snapshots.map((snapshot) => ({
      period: snapshot.period,
      granularity: snapshot.granularity,
      site: snapshot.siteName,
      asset: snapshot.assetName,
      technician: snapshot.technicianName,
      mtbfHours: snapshot.mtbfHours,
      mttrHours: snapshot.mttrHours,
      responseSlaRate: snapshot.responseSlaRate,
      resolutionSlaRate: snapshot.resolutionSlaRate,
      technicianUtilization: snapshot.technicianUtilization,
      downtimeHours: snapshot.downtimeHours,
      maintenanceCost: snapshot.maintenanceCost,
    }));
    download('analytics-snapshots.csv', toCsv(rows));
  };

  const onExportLeaders = () => {
    download('analytics-leaderboard.csv', toCsv(leaderboards));
  };

  const onExportComparisons = () => {
    download('analytics-comparisons.csv', toCsv(comparisons));
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <p className="text-sm font-semibold text-slate-800">Exports</p>
      <div className="flex gap-2 text-sm">
        <button onClick={onExportSnapshots} className="rounded border border-slate-200 px-3 py-1 hover:bg-slate-50" type="button">
          Snapshots (CSV)
        </button>
        <button onClick={onExportLeaders} className="rounded border border-slate-200 px-3 py-1 hover:bg-slate-50" type="button">
          Leaderboard (CSV)
        </button>
        <button onClick={onExportComparisons} className="rounded border border-slate-200 px-3 py-1 hover:bg-slate-50" type="button">
          Comparisons (CSV)
        </button>
      </div>
    </div>
  );
};
