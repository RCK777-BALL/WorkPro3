/*
 * SPDX-License-Identifier: MIT
 */

import clsx from 'clsx';

import type { AssetHistoryEntry } from '@/api/assets';

const statusColors: Record<string, string> = {
  completed: 'bg-emerald-500/30 text-emerald-200',
  in_progress: 'bg-[color-mix(in_srgb,var(--wp-color-primary)_30%,transparent)] text-[var(--wp-color-text)]',
  delayed: 'bg-amber-500/20 text-amber-300',
};

export type AssetHistoryTimelineProps = {
  entries?: AssetHistoryEntry[];
  isLoading?: boolean;
};

const formatDate = (value: string) => new Date(value).toLocaleDateString();

const AssetHistoryTimeline = ({ entries, isLoading }: AssetHistoryTimelineProps) => {
  if (isLoading) {
    return <p className="text-sm text-[var(--wp-color-text-muted)]">Loading history...</p>;
  }

  if (!entries?.length) {
    return <p className="text-sm text-[var(--wp-color-text-muted)]">No recent work logged for this asset.</p>;
  }

  return (
    <ol className="space-y-4">
      {entries.map((entry) => (
        <li key={entry.id} className="relative pl-6">
          <span className="absolute left-1 top-2 h-2 w-2 rounded-full bg-indigo-400" aria-hidden />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-[var(--wp-color-text)]">{entry.title}</p>
            <span className="text-xs text-[var(--wp-color-text-muted)]">{formatDate(entry.date)}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--wp-color-text-muted)]">
            <span className={clsx('rounded-full px-2 py-0.5 uppercase', statusColors[entry.status] ?? 'bg-[var(--wp-color-surface-elevated)] text-[var(--wp-color-text-muted)]')}>
              {entry.status}
            </span>
            {typeof entry.duration === 'number' && entry.duration > 0 && <span>{entry.duration} hrs</span>}
          </div>
          {entry.notes && <p className="mt-2 text-sm text-[var(--wp-color-text-muted)]">{entry.notes}</p>}
        </li>
      ))}
    </ol>
  );
};

export default AssetHistoryTimeline;

