/*
 * SPDX-License-Identifier: MIT
 */

import React from 'react';
import type { LeaderboardEntry } from '@/api/analyticsWarehouse';

interface Props {
  title: string;
  entries: LeaderboardEntry[];
  accent?: 'blue' | 'emerald' | 'amber';
}

const formatNumber = (value: number, suffix = '') => `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })}${suffix}`;

export const LeaderboardPanel: React.FC<Props> = ({ title, entries, accent = 'blue' }) => {
  const colors = {
    blue: 'bg-blue-50 text-blue-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
  }[accent];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <header className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${colors}`}>Top {Math.min(entries.length, 5)}</span>
      </header>
      <ul className="space-y-2">
        {entries.slice(0, 5).map((entry) => (
          <li key={entry.id ?? entry.label} className="flex items-center justify-between rounded-md border border-slate-100 px-3 py-2">
            <div className="flex flex-col">
              <span className="font-semibold text-slate-800">{entry.label}</span>
              <span className="text-xs uppercase text-slate-500">Downtime {formatNumber(entry.downtimeHours, 'h')}</span>
            </div>
            <div className="flex gap-4 text-right text-sm text-slate-700">
              <div>
                <p className="text-xs uppercase text-slate-500">MTTR</p>
                <p className="font-semibold">{formatNumber(entry.mttrHours, 'h')}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500">Cost</p>
                <p className="font-semibold">${formatNumber(entry.maintenanceCost)}</p>
              </div>
              {entry.technicianUtilization !== undefined && (
                <div>
                  <p className="text-xs uppercase text-slate-500">Utilization</p>
                  <p className="font-semibold">{formatNumber(entry.technicianUtilization, '%')}</p>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
