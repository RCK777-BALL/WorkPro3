/*
 * SPDX-License-Identifier: MIT
 */

import React from 'react';
import { useMobileSync } from '../useMobileSync';

export const QueuedSyncPanel: React.FC = () => {
  const { queue, conflicts, markSynced, resolveConflict } = useMobileSync();

  const queuedIds = queue.map((item) => item.id);

  return (
    <div className="space-y-3 rounded-lg border border-neutral-200 bg-white p-3 shadow-sm" data-testid="queued-sync-panel">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-neutral-900">Offline queue</p>
          <p className="text-xs text-neutral-600">Create/update actions waiting for sync</p>
        </div>
        <button
          className="rounded bg-neutral-100 px-3 py-1.5 text-xs font-semibold text-neutral-800 disabled:opacity-60"
          disabled={queue.length === 0}
          onClick={() => markSynced(queuedIds)}
        >
          Mark synced
        </button>
      </header>

      <ul className="space-y-2 text-sm text-neutral-800" aria-label="Queued actions">
        {queue.length === 0 && <li className="text-neutral-500">No pending actions.</li>}
        {queue.map((action) => (
          <li key={action.id} className="rounded border border-dashed border-amber-300 bg-amber-50 px-3 py-2">
            <p className="font-semibold">{action.operation} {action.entityType}</p>
            <p className="text-xs text-neutral-600">Local version: {action.version ?? 'n/a'}</p>
            {action.payload && <pre className="mt-1 whitespace-pre-wrap text-xs text-neutral-700">{JSON.stringify(action.payload, null, 2)}</pre>}
          </li>
        ))}
      </ul>

      <div className="space-y-2" aria-label="Conflicts">
        <p className="text-sm font-semibold text-rose-700">Conflicts</p>
        {conflicts.length === 0 && <p className="text-xs text-neutral-500">No conflicts detected.</p>}
        {conflicts.map((conflict) => (
          <div key={conflict.id} className="space-y-1 rounded border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900">
            <p className="font-semibold">{conflict.entityType} edit conflicted</p>
            <p>Operation: {conflict.operation}</p>
            <p>Version: {conflict.version ?? 'n/a'}</p>
            <div className="flex gap-2 pt-1 text-[13px]">
              <button
                className="rounded bg-rose-600 px-3 py-1 text-white"
                onClick={() => resolveConflict(conflict.id, false)}
              >
                Use server value
              </button>
              <button
                className="rounded bg-blue-600 px-3 py-1 text-white"
                onClick={() => resolveConflict(conflict.id, true)}
              >
                Re-queue local change
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default QueuedSyncPanel;
