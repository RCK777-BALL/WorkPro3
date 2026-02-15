/*
 * SPDX-License-Identifier: MIT
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDownToLine, Filter, RefreshCcw } from 'lucide-react';

import { useToast } from '@/context/ToastContext';

import { exportAuditLogs, fetchAuditLogs } from './api';
import type { AuditLog, AuditLogFilters } from './types';

const ENTITY_OPTIONS = ['WorkOrder', 'Asset', 'PMTask', 'InventoryItem', 'User', 'Settings'];
const ACTION_OPTIONS = ['create', 'update', 'delete', 'approve', 'assign', 'start', 'complete', 'cancel', 'use'];

const createDefaultFilters = (): AuditLogFilters => {
  const start = new Date();
  start.setDate(start.getDate() - 7);
  return { start: start.toISOString().slice(0, 10) };
};

const formatDateTime = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const toActorLabel = (log: AuditLog): string =>
  log.actor?.name || log.actor?.email || 'System';

const toEntityLabel = (log: AuditLog): string =>
  log.entity?.label || log.entityId || log.entityType;

const renderDiffDetails = (log: AuditLog) => {
  if (log.diff && log.diff.length > 0) {
    const entries = log.diff.slice(0, 5);
    return (
      <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer text-indigo-400">View {log.diff.length} change{log.diff.length === 1 ? '' : 's'}</summary>
        <ul className="mt-1 space-y-1">
          {entries.map((entry, idx) => (
            <li key={`${entry.path}-${idx}`}>
              <span className="font-semibold text-slate-200">{entry.path}</span>:&nbsp;
              <span className="text-red-400">{JSON.stringify(entry.before)}</span>
              <span className="text-slate-500"> → </span>
              <span className="text-emerald-400">{JSON.stringify(entry.after)}</span>
            </li>
          ))}
          {log.diff.length > entries.length && (
            <li className="text-slate-400">+{log.diff.length - entries.length} more change(s)</li>
          )}
        </ul>
      </details>
    );
  }
  if (log.after && !log.before) {
    return <p className="text-xs text-emerald-400">Record created</p>;
  }
  if (log.before && !log.after) {
    return <p className="text-xs text-rose-400">Record deleted</p>;
  }
  return <p className="text-xs text-slate-400">No field-level changes captured</p>;
};

export default function AuditLogsPage() {
  const { addToast } = useToast();
  const [filters, setFilters] = useState<AuditLogFilters>(() => createDefaultFilters());
  const [draftFilters, setDraftFilters] = useState<AuditLogFilters>(() => createDefaultFilters());
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [exporting, setExporting] = useState<boolean>(false);

  const loadLogs = useCallback(
    async (append = false, cursorOverride?: string) => {
      setError(null);
      setLoading(true);
      try {
        const page = await fetchAuditLogs(filters, cursorOverride);
        setLogs((prev) => (append ? [...prev, ...page.items] : page.items));
        setNextCursor(page.nextCursor);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load audit logs';
        setError(message);
        addToast(message, 'error');
        if (!append) {
          setLogs([]);
          setNextCursor(undefined);
        }
      } finally {
        setLoading(false);
      }
    },
    [filters, addToast],
  );

  useEffect(() => {
    loadLogs(false);
  }, [loadLogs]);

  const handleInput = (key: keyof AuditLogFilters, value?: string) => {
    setDraftFilters((prev) => ({ ...prev, [key]: value || undefined }));
  };

  const handleApplyFilters = () => {
    setFilters({ ...draftFilters });
  };

  const handleResetFilters = () => {
    const defaults = createDefaultFilters();
    setDraftFilters(defaults);
    setFilters(defaults);
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const blob = await exportAuditLogs(filters);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit-logs-${new Date().toISOString()}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      addToast('Audit log export started', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to export logs';
      addToast(message, 'error');
    } finally {
      setExporting(false);
    }
  };

  const headerSummary = useMemo(() => {
    if (loading) return 'Loading activity…';
    if (logs.length === 0) return 'No activity recorded for this range';
    return `${logs.length} event${logs.length === 1 ? '' : 's'} loaded`;
  }, [loading, logs.length]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-wide text-slate-400">Administration</p>
          <h1 className="text-3xl font-semibold">Audit Logs</h1>
          <p className="text-sm text-slate-400">{headerSummary}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting || loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ArrowDownToLine className="h-4 w-4" /> Export CSV
          </button>
          <button
            type="button"
            onClick={() => loadLogs(false)}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCcw className="h-4 w-4" /> Refresh
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 shadow-lg shadow-slate-900/40">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-200">
          <Filter className="h-4 w-4" /> Filters
        </div>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            handleApplyFilters();
          }}
        >
          <div className="grid gap-4 md:grid-cols-3">
            <label className="flex flex-col gap-1 text-sm text-slate-300">
              Entity
              <select
                className="rounded-xl border border-slate-700 bg-transparent px-3 py-2"
                value={draftFilters.entityType ?? ''}
                onChange={(event) => handleInput('entityType', event.target.value)}
              >
                <option value="">All entities</option>
                {ENTITY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-300">
              Action
              <select
                className="rounded-xl border border-slate-700 bg-transparent px-3 py-2"
                value={draftFilters.action ?? ''}
                onChange={(event) => handleInput('action', event.target.value)}
              >
                <option value="">All actions</option>
                {ACTION_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-300">
              Actor
              <input
                type="text"
                placeholder="Name or email"
                className="rounded-xl border border-slate-700 bg-transparent px-3 py-2"
                value={draftFilters.actor ?? ''}
                onChange={(event) => handleInput('actor', event.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-300">
              Site
              <input
                type="text"
                placeholder="Optional site filter"
                className="rounded-xl border border-slate-700 bg-transparent px-3 py-2"
                value={draftFilters.siteId ?? ''}
                onChange={(event) => handleInput('siteId', event.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-300">
              Entity ID
              <input
                type="text"
                placeholder="e.g. 12345"
                className="rounded-xl border border-slate-700 bg-transparent px-3 py-2"
                value={draftFilters.entityId ?? ''}
                onChange={(event) => handleInput('entityId', event.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-300">
              Start date
              <input
                type="date"
                className="rounded-xl border border-slate-700 bg-transparent px-3 py-2"
                value={draftFilters.start ?? ''}
                onChange={(event) => handleInput('start', event.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-300">
              End date
              <input
                type="date"
                className="rounded-xl border border-slate-700 bg-transparent px-3 py-2"
                value={draftFilters.end ?? ''}
                onChange={(event) => handleInput('end', event.target.value)}
              />
            </label>
          </div>
          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={handleResetFilters}
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
            >
              Reset
            </button>
            <button
              type="submit"
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 transition hover:bg-indigo-500"
            >
              Apply
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-0 shadow-lg shadow-slate-900/50">
        {error && (
          <div className="border-b border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>
        )}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-800">
            <thead className="bg-slate-900/60 text-left text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Entity</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/80">
              {loading && logs.length === 0 ? (
                [...Array(5)].map((_, idx) => (
                  <tr key={`skeleton-${idx}`}>
                    <td className="px-4 py-4" colSpan={5}>
                      <div className="h-5 animate-pulse rounded bg-slate-800/70" />
                    </td>
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-sm text-slate-400">
                    No audit events match your filters.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log._id} className="text-sm text-slate-200">
                    <td className="px-4 py-3 align-top text-slate-400">{formatDateTime(log.ts)}</td>
                    <td className="px-4 py-3 align-top">
                      <div className="font-semibold text-slate-100">{toEntityLabel(log)}</div>
                      <p className="text-xs text-slate-500">{log.entityType}</p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span className="inline-flex rounded-full border border-indigo-400/40 bg-indigo-500/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-indigo-200">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top text-slate-300">{toActorLabel(log)}</td>
                    <td className="px-4 py-3 align-top">{renderDiffDetails(log)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {nextCursor && (
          <div className="border-t border-slate-900/80 p-4 text-center">
            <button
              type="button"
              onClick={() => loadLogs(true, nextCursor)}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Loading…' : 'Load more'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
