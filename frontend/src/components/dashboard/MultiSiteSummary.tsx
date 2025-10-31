/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useState } from 'react';
import http from '@/lib/http';

interface SummaryResponse {
  totalPlants: number;
  totalDepartments: number;
}

export default function MultiSiteSummary() {
  const [summary, setSummary] = useState<SummaryResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await http.get<SummaryResponse>('/global/summary');
        if (!cancelled) {
          setSummary(response.data);
        }
      } catch (err) {
        console.error('Failed to load multi-site summary', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 text-slate-100">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
        Global Overview
      </h3>
      <div className="mt-3 flex items-center gap-6 text-sm">
        <div>
          <p className="text-xs uppercase text-slate-500">Plants</p>
          <p className="text-lg font-semibold">{summary?.totalPlants ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-slate-500">Departments</p>
          <p className="text-lg font-semibold">{summary?.totalDepartments ?? '—'}</p>
        </div>
      </div>
    </div>
  );
}
