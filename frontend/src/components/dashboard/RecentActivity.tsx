/*
 * SPDX-License-Identifier: MIT
 */

import { Activity, Clock3, RefreshCcw } from 'lucide-react';

import type { AuditLog } from '@/features/audit';

interface RecentActivityProps {
  logs: AuditLog[];
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
}

const relativeTime = (value: string): string => {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return value;
  const diffMs = Date.now() - timestamp;
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
};

const toEntity = (log: AuditLog): string => log.entity?.label || log.entityId || log.entityType;
const toActor = (log: AuditLog): string => log.actor?.name || log.actor?.email || 'System';

export default function RecentActivity({ logs, loading = false, error, onRefresh }: RecentActivityProps) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 shadow-lg shadow-slate-900/40">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
          <Activity className="h-4 w-4" /> Recent Activity
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center gap-1 rounded-xl border border-slate-700 px-2 py-1 text-xs text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
        >
          <RefreshCcw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>
      {error && (
        <div className="border-b border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs text-rose-200">{error}</div>
      )}
      <div className="divide-y divide-slate-800">
        {loading && logs.length === 0 ? (
          [...Array(4)].map((_, idx) => (
            <div key={`activity-skeleton-${idx}`} className="px-4 py-3">
              <div className="mb-2 h-4 w-2/3 animate-pulse rounded bg-slate-800" />
              <div className="h-3 w-1/3 animate-pulse rounded bg-slate-800" />
            </div>
          ))
        ) : logs.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-slate-400">No recent changes recorded.</div>
        ) : (
          logs.slice(0, 8).map((log) => (
            <div key={log._id} className="px-4 py-3">
              <div className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-semibold text-slate-100">
                    {toActor(log)} <span className="text-slate-500">{log.action}</span>
                  </p>
                  <p className="text-xs text-slate-400">
                    {toEntity(log)} · {log.entityType}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <Clock3 className="h-3.5 w-3.5" /> {relativeTime(log.ts)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
