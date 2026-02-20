/*
 * SPDX-License-Identifier: MIT
 */

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Edit3, Search } from 'lucide-react';

import {
  createDowntimeLog,
  downtimeKeys,
  type DowntimeLog,
  type DowntimePayload,
  fetchDowntimeAssets,
  fetchDowntimeWorkOrders,
  updateDowntimeLog,
  useDowntimeLogsQuery,
  type DowntimeAssetOption,
  type DowntimeWorkOrderOption,
} from '@/api/downtime';
import DowntimeForm, { type DowntimeFormValues } from '@/features/downtime/DowntimeForm';
import { useToast } from '@/context/ToastContext';

const toMinutes = (start?: string, end?: string) => {
  if (!start || !end) return null;
  const duration = (new Date(end).getTime() - new Date(start).getTime()) / 60000;
  return duration > 0 ? duration : null;
};

const formatDateTime = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
};

const formatDuration = (minutes: number | null) => {
  if (minutes === null) return '—';
  if (minutes < 60) return `${minutes.toFixed(0)} min`;
  return `${(minutes / 60).toFixed(2)} h`;
};

const hasOverlap = (
  candidate: { assetId: string; start: string; end: string; id?: string },
  logs: DowntimeLog[],
) => {
  const startA = new Date(candidate.start).getTime();
  const endA = new Date(candidate.end).getTime();
  return logs.some((log) => {
    if (log.assetId !== candidate.assetId || log.id === candidate.id || !log.end) return false;
    const startB = new Date(log.start).getTime();
    const endB = new Date(log.end).getTime();
    return startA < endB && endA > startB;
  });
};

const DowntimeLogsPage = () => {
  const { data: logs = [], isLoading } = useDowntimeLogsQuery();
  const { data: assets = [] } = useQuery({ queryKey: downtimeKeys.assets, queryFn: fetchDowntimeAssets });
  const { data: workOrders = [] } = useQuery({
    queryKey: downtimeKeys.workOrders,
    queryFn: fetchDowntimeWorkOrders,
  });
  const [search, setSearch] = useState('');
  const [assetFilter, setAssetFilter] = useState('');
  const [editing, setEditing] = useState<DowntimeLog | null>(null);
  const [overlapError, setOverlapError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const mappedLogs = useMemo(() => {
    const assetMap = new Map<string, DowntimeAssetOption>();
    assets.forEach((asset) => assetMap.set(asset.id, asset));
    const woMap = new Map<string, DowntimeWorkOrderOption>();
    workOrders.forEach((wo) => woMap.set(wo.id, wo));

    return logs.map((log) => ({
      ...log,
      durationMinutes: log.durationMinutes ?? toMinutes(log.start, log.end) ?? undefined,
      assetName: log.assetName ?? assetMap.get(log.assetId)?.name,
      workOrderTitle: log.workOrderTitle ?? (log.workOrderId ? woMap.get(log.workOrderId)?.title : undefined),
    }));
  }, [assets, logs, workOrders]);

  const filteredLogs = useMemo(() => {
    const term = search.trim().toLowerCase();
    return mappedLogs.filter((log) => {
      if (assetFilter && log.assetId !== assetFilter) return false;
      if (!term) return true;
      const haystack = [log.assetName, log.workOrderTitle, log.cause, log.impact]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [assetFilter, mappedLogs, search]);

  const resetEditing = () => {
    setEditing(null);
    setOverlapError(null);
  };

  const createMutation = useMutation({
    mutationFn: createDowntimeLog,
    onSuccess: () => {
      addToast('Downtime entry saved', 'success');
      void queryClient.invalidateQueries({ queryKey: downtimeKeys.all });
    },
    onError: () => addToast('Failed to save downtime entry', 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: DowntimePayload }) => updateDowntimeLog(id, payload),
    onSuccess: () => {
      addToast('Downtime entry updated', 'success');
      void queryClient.invalidateQueries({ queryKey: downtimeKeys.all });
    },
    onError: () => addToast('Failed to update downtime entry', 'error'),
  });

  const onSubmit = async (values: DowntimeFormValues) => {
    const payload: DowntimePayload = {
      assetId: values.assetId,
      workOrderId: values.workOrderId || undefined,
      start: values.start,
      end: values.end,
      cause: values.cause,
      impact: values.impact,
    };

    const overlap = hasOverlap({ ...payload, id: editing?.id }, mappedLogs);
    if (overlap) {
      setOverlapError('Downtime for this asset cannot overlap existing entries.');
      return;
    }

    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, payload });
      resetEditing();
    } else {
      await createMutation.mutateAsync(payload);
    }
    setOverlapError(null);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--wp-color-text)]">Downtime</h1>
          <p className="text-sm text-[var(--wp-color-text-muted)]">
            Log asset downtime with linked work orders, root causes, and operational impacts.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 md:w-96 md:flex-row md:items-center">
          <div className="flex flex-1 items-center gap-2 rounded border border-[var(--wp-color-border)] bg-[var(--wp-color-surface)] px-3 py-2">
            <Search className="h-4 w-4 text-[var(--wp-color-text-muted)]" />
            <input
              type="search"
              placeholder="Search cause, impact, or work order"
              className="w-full bg-transparent text-sm text-[var(--wp-color-text)] outline-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="w-full rounded border border-[var(--wp-color-border)] bg-[var(--wp-color-surface)] px-3 py-2 text-sm text-[var(--wp-color-text)] md:w-48"
            value={assetFilter}
            onChange={(e) => setAssetFilter(e.target.value)}
            data-testid="asset-filter"
          >
            <option value="">All assets</option>
            {assets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.name}
              </option>
            ))}
          </select>
        </div>
      </header>

      <DowntimeForm
        assets={assets}
        workOrders={workOrders}
        onSubmit={onSubmit}
        defaultValues={editing}
        onCancelEdit={resetEditing}
        isSaving={createMutation.isPending || updateMutation.isPending}
        overlapError={overlapError}
      />

      <div className="overflow-x-auto rounded-lg border border-[var(--wp-color-border)] bg-[var(--wp-color-surface)]">
        <table className="min-w-full divide-y divide-neutral-800 text-sm text-[var(--wp-color-text)]">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-[var(--wp-color-text-muted)]">
              <th className="px-4 py-3">Asset</th>
              <th className="px-4 py-3">Work order</th>
              <th className="px-4 py-3">Start</th>
              <th className="px-4 py-3">End</th>
              <th className="px-4 py-3">Duration</th>
              <th className="px-4 py-3">Cause</th>
              <th className="px-4 py-3">Impact</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-[var(--wp-color-text-muted)]">
                  Loading downtime entries…
                </td>
              </tr>
            )}
            {!isLoading && filteredLogs.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-[var(--wp-color-text-muted)]">
                  No downtime entries match your filters.
                </td>
              </tr>
            )}
            {filteredLogs.map((log) => (
              <tr key={log.id} className="border-t border-[var(--wp-color-border)]">
                <td className="px-4 py-3">{log.assetName ?? log.assetId}</td>
                <td className="px-4 py-3 text-[var(--wp-color-text-muted)]">{log.workOrderTitle ?? log.workOrderId ?? '—'}</td>
                <td className="px-4 py-3 text-[var(--wp-color-text-muted)]">{formatDateTime(log.start)}</td>
                <td className="px-4 py-3 text-[var(--wp-color-text-muted)]">{formatDateTime(log.end)}</td>
                <td className="px-4 py-3 text-[var(--wp-color-text)]">{formatDuration(log.durationMinutes ?? null)}</td>
                <td className="px-4 py-3 text-[var(--wp-color-text)]">{log.cause ?? '—'}</td>
                <td className="px-4 py-3 text-[var(--wp-color-text)]">{log.impact ?? '—'}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    className="inline-flex items-center gap-1 rounded px-3 py-1 text-xs font-semibold text-blue-300 hover:bg-blue-500/10"
                    onClick={() => {
                      setEditing(log);
                      setOverlapError(null);
                    }}
                    aria-label={`Edit downtime ${log.id}`}
                  >
                    <Edit3 className="h-4 w-4" />
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {overlapError && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4" />
          <span>{overlapError}</span>
        </div>
      )}
    </div>
  );
};

export default DowntimeLogsPage;


