/*
 * SPDX-License-Identifier: MIT
 */

import type { AssetDowntimeLog } from '@/api/assets';

type Props = {
  logs: AssetDowntimeLog[];
  isLoading?: boolean;
  maxItems?: number;
};

const formatDuration = (minutes: number) => {
  if (!minutes) return '—';
  if (minutes < 60) return `${minutes.toFixed(0)} min`;
  const hours = minutes / 60;
  return `${hours.toFixed(2)} h`;
};

const formatTimestamp = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
};

const DowntimeHistory = ({ logs, isLoading, maxItems }: Props) => {
  const entries = maxItems ? logs.slice(0, maxItems) : logs;

  if (isLoading) {
    return <p className="text-sm text-neutral-400">Loading downtime history…</p>;
  }

  if (!entries.length) {
    return <p className="text-sm text-neutral-500">No recorded downtime events for this asset.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-neutral-200">
        <thead className="border-b border-neutral-800 text-left text-xs uppercase tracking-wide text-neutral-400">
          <tr>
            <th className="px-2 py-2">Start</th>
            <th className="px-2 py-2">End</th>
            <th className="px-2 py-2">Reason</th>
            <th className="px-2 py-2 text-right">Duration</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((log) => (
            <tr key={log.id} className="border-b border-neutral-900/70 last:border-0">
              <td className="px-2 py-2 text-neutral-100">{formatTimestamp(log.start)}</td>
              <td className="px-2 py-2 text-neutral-200">{formatTimestamp(log.end)}</td>
              <td className="px-2 py-2 text-neutral-300">{log.reason ?? 'Unspecified'}</td>
              <td className="px-2 py-2 text-right font-semibold text-neutral-100">
                {formatDuration(log.durationMinutes)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DowntimeHistory;
