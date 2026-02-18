/* eslint-disable react-hooks/exhaustive-deps */
/*
 * SPDX-License-Identifier: MIT
 */

import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { SimpleLineChart } from '@/components/charts/SimpleLineChart';
import Card from '@/components/common/Card';
import { usePmCompletionAnalytics } from '@/hooks/usePmAnalytics';

import type { PmCompletionPoint } from '@backend-shared/pmAnalytics';

type StatusStackDatum = Pick<PmCompletionPoint, 'period' | 'onTime' | 'late' | 'missed'>;

const percentFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });

export default function PMAnalytics() {
  const [months, setMonths] = useState(6);
  const analyticsQuery = usePmCompletionAnalytics(months);

  const trend = analyticsQuery.data?.trend ?? [];
  const totals = analyticsQuery.data?.totals;

  const completionTrend = useMemo(
    () => trend.map((point) => ({ label: point.period, value: Number(point.completionRate ?? 0) })),
    [trend],
  );

  const statusTrend = useMemo<StatusStackDatum[]>(
    () =>
      trend.map((point) => ({
        period: point.period,
        onTime: point.onTime,
        late: point.late,
        missed: point.missed,
      })),
    [trend],
  );

  const isLoading = analyticsQuery.isLoading;
  const isError = analyticsQuery.isError;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-indigo-600">Preventive analytics</p>
          <h1 className="text-3xl font-semibold text-[var(--wp-color-text)] dark:text-[var(--wp-color-text)]">PM performance</h1>
          <p className="text-sm text-[var(--wp-color-text-muted)] dark:text-[var(--wp-color-text-muted)]">
            Track on-time, late, and missed preventive work along with completion rates.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-[var(--wp-color-text)] dark:text-[var(--wp-color-text-muted)]">
            <span>Window</span>
            <select
              value={months}
              onChange={(event) => setMonths(Number(event.target.value))}
              className="rounded-md border border-[var(--wp-color-border)] bg-[var(--wp-color-surface)] px-3 py-2 text-sm dark:border-[var(--wp-color-border)] dark:bg-[var(--wp-color-surface)]"
              aria-label="Select reporting window"
            >
              {[3, 6, 9, 12, 18].map((value) => (
                <option key={value} value={value}>
                  Last {value} months
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {isError ? (
        <div className="rounded-xl border border-error-200 bg-error-50 p-4 text-error-700 dark:border-error-700 dark:bg-error-900/30">
          Unable to load PM analytics. Please retry shortly.
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card title="On time" subtitle="Completed before due date" className="bg-[var(--wp-color-surface)] dark:bg-[var(--wp-color-surface)]">
          <p className="text-3xl font-semibold text-[var(--wp-color-text)] dark:text-[var(--wp-color-text)]">{totals?.onTime ?? '–'}</p>
        </Card>
        <Card title="Late" subtitle="Completed after due date" className="bg-[var(--wp-color-surface)] dark:bg-[var(--wp-color-surface)]">
          <p className="text-3xl font-semibold text-[var(--wp-color-text)] dark:text-[var(--wp-color-text)]">{totals?.late ?? '–'}</p>
        </Card>
        <Card title="Missed" subtitle="Due but not completed" className="bg-[var(--wp-color-surface)] dark:bg-[var(--wp-color-surface)]">
          <p className="text-3xl font-semibold text-[var(--wp-color-text)] dark:text-[var(--wp-color-text)]">{totals?.missed ?? '–'}</p>
        </Card>
        <Card title="Completion rate" subtitle="On-time + late vs scheduled" className="bg-[var(--wp-color-surface)] dark:bg-[var(--wp-color-surface)]">
          <p className="text-3xl font-semibold text-[var(--wp-color-text)] dark:text-[var(--wp-color-text)]">
            {totals ? `${percentFormatter.format(totals.completionRate)}%` : '–'}
          </p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Completion rate over time" className="h-[360px] bg-[var(--wp-color-surface)] dark:bg-[var(--wp-color-surface)]">
          {isLoading ? (
            <div className="flex h-full items-center justify-center text-[var(--wp-color-text-muted)] dark:text-[var(--wp-color-text-muted)]">
              Loading trend…
            </div>
          ) : (
            <SimpleLineChart data={completionTrend} className="h-full" showDots stroke="#4f46e5" />
          )}
        </Card>
        <Card title="On-time vs late vs missed" className="h-[360px] bg-[var(--wp-color-surface)] dark:bg-[var(--wp-color-surface)]">
          {isLoading ? (
            <div className="flex h-full items-center justify-center text-[var(--wp-color-text-muted)] dark:text-[var(--wp-color-text-muted)]">
              Loading breakdown…
            </div>
          ) : statusTrend.length ? (
            <div className="h-full w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusTrend} margin={{ top: 16, right: 24, left: 8, bottom: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.3)" vertical={false} />
                  <XAxis dataKey="period" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#64748b' }} width={40} allowDecimals={false} />
                  <Tooltip
                    cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
                    contentStyle={{ backgroundColor: '#0f172a', border: 'none', color: '#f8fafc' }}
                    labelStyle={{ color: '#cbd5e1', fontWeight: 600 }}
                    formatter={(value: number) => value.toLocaleString()}
                  />
                  <Legend />
                  <Bar dataKey="onTime" stackId="status" fill="#22c55e" name="On time" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="late" stackId="status" fill="#f97316" name="Late" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="missed" stackId="status" fill="#ef4444" name="Missed" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-[var(--wp-color-text-muted)] dark:text-[var(--wp-color-text-muted)]">
              No status data available for the selected window.
            </div>
          )}
        </Card>
      </div>

      <Card title="Monthly breakdown" className="bg-[var(--wp-color-surface)] dark:bg-[var(--wp-color-surface)]">
        {isLoading ? (
          <div className="p-4 text-[var(--wp-color-text-muted)] dark:text-[var(--wp-color-text-muted)]">Loading breakdown…</div>
        ) : trend.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-[var(--wp-color-text-muted)] dark:text-[var(--wp-color-text-muted)]">
                <tr>
                  <th className="px-4 py-2 font-semibold">Period</th>
                  <th className="px-4 py-2 font-semibold">On time</th>
                  <th className="px-4 py-2 font-semibold">Late</th>
                  <th className="px-4 py-2 font-semibold">Missed</th>
                  <th className="px-4 py-2 font-semibold">Scheduled</th>
                  <th className="px-4 py-2 font-semibold">Completion rate</th>
                </tr>
              </thead>
              <tbody>
                {trend.map((point) => (
                  <tr key={point.period} className="border-t border-[var(--wp-color-border)] dark:border-[var(--wp-color-border)]">
                    <td className="px-4 py-3 text-[var(--wp-color-text)] dark:text-[var(--wp-color-text)]">{point.period}</td>
                    <td className="px-4 py-3">{point.onTime}</td>
                    <td className="px-4 py-3">{point.late}</td>
                    <td className="px-4 py-3">{point.missed}</td>
                    <td className="px-4 py-3">{point.total}</td>
                    <td className="px-4 py-3">{percentFormatter.format(point.completionRate)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 text-[var(--wp-color-text-muted)] dark:text-[var(--wp-color-text-muted)]">No preventive work orders found in this window.</div>
        )}
      </Card>
    </div>
  );
}


