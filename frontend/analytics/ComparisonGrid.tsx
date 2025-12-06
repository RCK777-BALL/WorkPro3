/*
 * SPDX-License-Identifier: MIT
 */

import React from 'react';
import type { ComparisonRow } from '@/api/analyticsWarehouse';

interface Props {
  rows: ComparisonRow[];
}

const pct = (value: number) => `${value.toFixed(1)}%`;

export const ComparisonGrid: React.FC<Props> = ({ rows }) => (
  <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
    <header className="mb-3">
      <h3 className="text-lg font-semibold text-slate-800">Cross-site comparisons</h3>
      <p className="text-sm text-slate-600">Line up downtime, cost, and SLA performance by site for quick prioritization.</p>
    </header>
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-4 py-2">Site</th>
            <th className="px-4 py-2">Downtime (h)</th>
            <th className="px-4 py-2">Maintenance cost</th>
            <th className="px-4 py-2">MTBF (h)</th>
            <th className="px-4 py-2">MTTR (h)</th>
            <th className="px-4 py-2">SLA response</th>
            <th className="px-4 py-2">SLA resolve</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={row.siteId ?? row.siteName} className="hover:bg-slate-50">
              <td className="px-4 py-2 font-semibold text-slate-800">{row.siteName ?? 'Unassigned site'}</td>
              <td className="px-4 py-2">{row.downtimeHours.toFixed(1)}</td>
              <td className="px-4 py-2">${row.maintenanceCost.toFixed(0)}</td>
              <td className="px-4 py-2">{row.mtbfHours.toFixed(1)}</td>
              <td className="px-4 py-2">{row.mttrHours.toFixed(1)}</td>
              <td className="px-4 py-2">{pct(row.responseSlaRate)}</td>
              <td className="px-4 py-2">{pct(row.resolutionSlaRate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);
