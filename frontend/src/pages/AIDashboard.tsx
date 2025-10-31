/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useState } from 'react';
import http from '@/lib/http';

interface Insight {
  plant: string;
  downtimeTrend: { trend: string; slope: number };
  wrenchTrend: { trend: string; slope: number };
  level: 'normal' | 'warning' | 'critical' | 'success';
  message: string;
}

const levelStyles: Record<Insight['level'], string> = {
  normal: 'border-slate-700 bg-slate-900/60 text-slate-200',
  warning: 'border-amber-500/40 bg-amber-500/10 text-amber-100',
  critical: 'border-rose-500/40 bg-rose-500/10 text-rose-100',
  success: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100',
};

export default function AIDashboard() {
  const [insights, setInsights] = useState<Insight[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await http.get<Insight[]>('/ai/insights');
        if (!cancelled) {
          setInsights(response.data ?? []);
        }
      } catch (err) {
        console.error('Failed to load AI insights', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-100">AI Maintenance Insights</h1>
        <p className="text-sm text-slate-400">
          Automated trend detection and alerts generated from your recent work orders.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {insights.map((insight) => (
          <div
            key={insight.plant}
            className={`rounded-lg border p-4 ${levelStyles[insight.level]}`}
          >
            <p className="text-xs uppercase tracking-wide text-slate-400">{insight.plant}</p>
            <p className="mt-2 text-sm font-medium">{insight.message}</p>
            <dl className="mt-3 grid gap-2 text-xs">
              <div>
                <dt className="text-slate-500">Downtime trend</dt>
                <dd>
                  {insight.downtimeTrend.trend} ({insight.downtimeTrend.slope.toFixed(1)})
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Wrench time trend</dt>
                <dd>
                  {insight.wrenchTrend.trend} ({insight.wrenchTrend.slope.toFixed(1)})
                </dd>
              </div>
            </dl>
          </div>
        ))}
        {insights.length === 0 && (
          <p className="text-sm text-slate-400">
            No AI insights available yet. Add work orders to generate trend data.
          </p>
        )}
      </div>
    </div>
  );
}
