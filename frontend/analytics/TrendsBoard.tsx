/*
 * SPDX-License-Identifier: MIT
 */

import React from 'react';
import type { Snapshot } from '@/api/analyticsWarehouse';

interface Props {
  snapshots: Snapshot[];
  title?: string;
}

const numberFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });

const metricLabel = (label: string, value: number, suffix = '') => (
  <div className="flex flex-col">
    <span className="text-xs uppercase text-slate-500">{label}</span>
    <span className="text-lg font-semibold">{numberFormatter.format(value)}{suffix}</span>
  </div>
);

export const TrendsBoard: React.FC<Props> = ({ snapshots, title = 'Reliability trends' }) => {
  const ordered = React.useMemo(
    () => [...snapshots].sort((a, b) => a.period.localeCompare(b.period)).slice(-12),
    [snapshots],
  );

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <header className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Trend window</p>
          <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
        </div>
        <div className="flex gap-4 text-right">
          {metricLabel('Avg MTBF (h)',
            ordered.length
              ? ordered.reduce((acc, cur) => acc + cur.mtbfHours, 0) / ordered.length
              : 0)}
          {metricLabel('Avg MTTR (h)',
            ordered.length
              ? ordered.reduce((acc, cur) => acc + cur.mttrHours, 0) / ordered.length
              : 0)}
          {metricLabel('SLA resolve',
            ordered.length
              ? ordered.reduce((acc, cur) => acc + cur.resolutionSlaRate, 0) / ordered.length
              : 0,
            '%')}
        </div>
      </header>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {ordered.map((snapshot) => (
          <div key={`${snapshot.period}-${snapshot.siteId ?? snapshot.assetId ?? snapshot.technicianId ?? 'all'}`} className="rounded-md border border-slate-100 p-3">
            <p className="text-sm font-medium text-slate-700">
              {snapshot.siteName || snapshot.assetName || snapshot.technicianName || snapshot.granularity.toUpperCase()} —
              <span className="ml-2 text-slate-500">{snapshot.period.slice(0, 10)}</span>
            </p>
            <dl className="mt-2 grid grid-cols-2 gap-2 text-sm text-slate-700">
              <div>
                <dt className="text-xs uppercase text-slate-500">MTBF</dt>
                <dd className="font-semibold">{numberFormatter.format(snapshot.mtbfHours)} h</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-slate-500">MTTR</dt>
                <dd className="font-semibold">{numberFormatter.format(snapshot.mttrHours)} h</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-slate-500">Downtime</dt>
                <dd className="font-semibold">{numberFormatter.format(snapshot.downtimeHours)} h</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-slate-500">Maintenance cost</dt>
                <dd className="font-semibold">${numberFormatter.format(snapshot.maintenanceCost)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-slate-500">Response SLA</dt>
                <dd className="font-semibold">{numberFormatter.format(snapshot.responseSlaRate)}%</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-slate-500">Resolve SLA</dt>
                <dd className="font-semibold">{numberFormatter.format(snapshot.resolutionSlaRate)}%</dd>
              </div>
            </dl>
          </div>
        ))}
      </div>
    </section>
  );
};
