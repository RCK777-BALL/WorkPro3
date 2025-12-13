/*
 * SPDX-License-Identifier: MIT
 */

import { Clock4, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { useMemo } from 'react';

import { useSyncStore } from '@/store/syncStore';

const formatTime = (timestamp?: number) => {
  if (!timestamp) return null;
  const elapsed = Date.now() - timestamp;
  if (elapsed < 60_000) return 'just now';
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
};

const SyncStatusIndicator = () => {
  const { offline, queued, processed, status, lastSyncedAt, conflict, error, itemStatuses } =
    useSyncStore();

  const breakdown = useMemo(() => {
    return Object.values(itemStatuses).reduce(
      (acc, current) => {
        acc[current] = (acc[current] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }, [itemStatuses]);
  const progressLabel = useMemo(() => {
    if (status === 'syncing') {
      const total = queued + processed;
      return total > 0 ? `${processed}/${total} synced` : 'Syncing…';
    }
    if (status === 'conflicted') {
      return 'Action required';
    }
    if (status === 'error') {
      return error ?? 'Sync failed';
    }
    if ((breakdown.retrying ?? 0) > 0) {
      return `${breakdown.retrying} retrying soon`;
    }
    if ((breakdown.failed ?? 0) > 0) {
      return `${breakdown.failed} failed`;
    }
    if (queued > 0) {
      return `${queued} item${queued === 1 ? '' : 's'} queued`;
    }
    return 'All changes are synced';
  }, [queued, processed, status, error, breakdown]);

  const statusClasses = useMemo(() => {
    if (status === 'syncing') return 'bg-amber-500/10 text-amber-100 border-amber-400/40';
    if (status === 'conflicted' || status === 'error') return 'bg-rose-500/10 text-rose-100 border-rose-400/40';
    if (offline) return 'bg-slate-500/20 text-slate-100 border-slate-400/40';
    return 'bg-emerald-500/10 text-emerald-100 border-emerald-400/40';
  }, [offline, status]);

  const icon = status === 'syncing' ? (
    <RefreshCw className="h-4 w-4 animate-spin" />
  ) : offline ? (
    <WifiOff className="h-4 w-4" />
  ) : (
    <Wifi className="h-4 w-4" />
  );

  return (
    <div
      className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition ${statusClasses}`}
      aria-live="polite"
    >
      {icon}
      <span>{progressLabel}</span>
      {lastSyncedAt && status === 'idle' && (
        <span className="flex items-center gap-1 text-[11px] text-slate-200/80">
          <Clock4 className="h-3 w-3" />
          {formatTime(lastSyncedAt)}
        </span>
      )}
      {(breakdown.retrying ?? 0) > 0 && (
        <span className="text-[11px] text-amber-100/80">
          {(breakdown.retrying ?? 0) === 1
            ? '1 retry scheduled'
            : `${breakdown.retrying} retries scheduled`}
        </span>
      )}
      {(breakdown.failed ?? 0) > 0 && (
        <span className="text-[11px] text-rose-100/80">
          {(breakdown.failed ?? 0) === 1 ? '1 sync failed' : `${breakdown.failed} syncs failed`}
        </span>
      )}
      {conflict && <span className="text-[11px]">Conflicts pending</span>}
    </div>
  );
};

export default SyncStatusIndicator;
