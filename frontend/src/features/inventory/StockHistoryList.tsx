/*
 * SPDX-License-Identifier: MIT
 */

import type { StockHistoryEntry } from '@/types';
import { formatInventoryLocation } from './location';

export const StockHistoryList = ({ entries }: { entries: StockHistoryEntry[] }) => (
  <div className="space-y-2">
    {entries.map((entry) => (
      <div key={entry.id} className="rounded-md border border-neutral-200 p-3">
        <div className="flex items-center justify-between text-sm text-neutral-700">
          <span>
            {entry.delta > 0 ? '+' : ''}
            {entry.delta} on {entry.partId}
          </span>
          <span className="text-xs text-neutral-500">
            {entry.createdAt ? new Date(entry.createdAt).toLocaleString() : '—'}
          </span>
        </div>
        <p className="text-xs text-neutral-500">
          {formatInventoryLocation({
            store: entry.location.store ?? 'Unassigned',
            room: entry.location.room,
            bin: entry.location.bin,
          })}
        </p>
        {entry.reason && <p className="text-xs text-neutral-500">{entry.reason}</p>}
      </div>
    ))}
    {!entries.length && <p className="text-sm text-neutral-500">No stock movements logged yet.</p>}
  </div>
);

export default StockHistoryList;

