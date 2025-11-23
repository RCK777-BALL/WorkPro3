/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useMemo, useState } from 'react';
import { Clock3 } from 'lucide-react';

import { fetchEntityAuditLogs } from './api';
import type { AuditLog } from './types';
import { useToast } from '@/context/ToastContext';

interface EntityAuditListProps {
  entityType: string;
  entityId?: string;
  siteId?: string;
  limit?: number;
}

const formatDateTime = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const ActorBadge = ({ log }: { log: AuditLog }) => (
  <div className="text-xs text-slate-400">
    {log.actor?.name || log.actor?.email || 'System'}
  </div>
);

const EntityAuditList = ({ entityType, entityId, siteId, limit = 10 }: EntityAuditListProps) => {
  const { addToast } = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subtitle = useMemo(() => {
    if (!entityId) return 'Select a record to load its audit history.';
    if (loading) return 'Loading audit history…';
    if (error) return error;
    return logs.length ? `${logs.length} change event(s)` : 'No recent activity recorded';
  }, [entityId, error, loading, logs.length]);

  useEffect(() => {
    if (!entityId) {
      setLogs([]);
      return;
    }

    setLoading(true);
    setError(null);
    fetchEntityAuditLogs(entityType, entityId, { siteId, limit })
      .then((page) => setLogs(page.items))
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Unable to load audit history';
        setError(message);
        addToast(message, 'error');
      })
      .finally(() => setLoading(false));
  }, [addToast, entityId, entityType, limit, siteId]);

  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-950/70">
      <header className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-indigo-300">Audit</p>
          <h3 className="text-lg font-semibold text-white">Change history</h3>
          <p className="text-xs text-neutral-400">{subtitle}</p>
        </div>
        <div className="rounded-full bg-neutral-900/80 p-2 text-indigo-300">
          <Clock3 className="h-4 w-4" />
        </div>
      </header>
      <div className="divide-y divide-neutral-900">
        {loading && (
          <div className="px-4 py-3 text-sm text-neutral-400">Loading audit events…</div>
        )}
        {!loading && logs.length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-neutral-500">
            No audit events found for this record.
          </div>
        )}
        {logs.map((log) => (
          <article key={log._id} className="px-4 py-3">
            <div className="flex items-center justify-between text-xs text-neutral-500">
              <span>{formatDateTime(log.ts)}</span>
              <span className="rounded-full border border-indigo-400/40 bg-indigo-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-indigo-200">
                {log.action}
              </span>
            </div>
            <div className="mt-1 text-sm font-semibold text-neutral-100">
              {log.entity?.label || log.entityId || log.entityType}
            </div>
            <div className="mt-1 text-xs text-neutral-400">{log.entityType}</div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-neutral-300">
              <ActorBadge log={log} />
              {log.diff?.length ? (
                <div className="rounded-lg border border-neutral-800 bg-neutral-900/70 px-2 py-1 text-[11px] text-neutral-300">
                  {log.diff.slice(0, 2).map((entry) => `${entry.path}: ${JSON.stringify(entry.before)} → ${JSON.stringify(entry.after)}`).join(' | ')}
                  {log.diff.length > 2 ? ` (+${log.diff.length - 2} more)` : ''}
                </div>
              ) : (
                <div className="rounded-lg border border-neutral-800 bg-neutral-900/70 px-2 py-1 text-[11px] text-neutral-400">
                  Snapshot only
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

export default EntityAuditList;
