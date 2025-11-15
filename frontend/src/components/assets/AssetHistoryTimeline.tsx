/*
 * SPDX-License-Identifier: MIT
 */

import clsx from 'clsx';

import type { AssetHistoryEntry } from '@/api/assets';

const statusColors: Record<string, string> = {
  completed: 'bg-emerald-500/30 text-emerald-200',
  in_progress: 'bg-indigo-500/30 text-indigo-100',
  delayed: 'bg-amber-500/30 text-amber-100',
};

export type AssetHistoryTimelineProps = {
  entries?: AssetHistoryEntry[];
  isLoading?: boolean;
};

const formatDate = (value: string) => new Date(value).toLocaleDateString();

const AssetHistoryTimeline = ({ entries, isLoading }: AssetHistoryTimelineProps) => {
  if (isLoading) {
    return <p className="text-sm text-neutral-400">Loading history…</p>;
  }

  if (!entries?.length) {
    return <p className="text-sm text-neutral-500">No recent work logged for this asset.</p>;
  }

  return (
    <ol className="space-y-4">
      {entries.map((entry) => (
        <li key={entry.id} className="relative pl-6">
          <span className="absolute left-1 top-2 h-2 w-2 rounded-full bg-indigo-400" aria-hidden />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-white">{entry.title}</p>
            <span className="text-xs text-neutral-400">{formatDate(entry.date)}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-400">
            <span className={clsx('rounded-full px-2 py-0.5 uppercase', statusColors[entry.status] ?? 'bg-neutral-800 text-neutral-300')}>
              {entry.status}
            </span>
            {typeof entry.duration === 'number' && entry.duration > 0 && <span>{entry.duration} hrs</span>}
          </div>
          {entry.notes && <p className="mt-2 text-sm text-neutral-300">{entry.notes}</p>}
        </li>
      ))}
    </ol>
  );
};

export default AssetHistoryTimeline;
