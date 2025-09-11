/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useRef } from 'react';
import type { SyncConflict } from '../../utils/offlineQueue';

type Props = {
  conflict: SyncConflict | null;
  onResolve: (choice: 'local' | 'server') => void;
  onClose: () => void;
};

export default function ConflictResolver({ conflict, onResolve, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (conflict) {
      ref.current?.showModal();
    } else {
      ref.current?.close();
    }
  }, [conflict]);

  if (!conflict) return null;

  return (
    <dialog
      ref={ref}
      className="rounded-xl w-[600px] max-w-[95vw] p-0 backdrop:bg-black/30"
    >
      <div className="p-6 space-y-4">
        <h3 className="text-lg font-semibold">Sync Conflict</h3>
        <p className="text-sm text-neutral-600">
          Local changes conflict with the server. Choose which version to keep.
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left">Field</th>
              <th className="text-left">Local</th>
              <th className="text-left">Server</th>
            </tr>
          </thead>
          <tbody>
            {conflict.diffs.map((d) => (
              <tr key={d.field}>
                <td className="font-medium pr-2">{d.field}</td>
                <td className="pr-2">{String(d.local ?? '')}</td>
                <td>{String(d.server ?? '')}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex justify-end gap-2 pt-2">
          <button
            className="rounded px-3 py-2 border hover:bg-neutral-100"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="rounded px-3 py-2 bg-neutral-200 hover:bg-neutral-300"
            onClick={() => onResolve('server')}
          >
            Use Server
          </button>
          <button
            className="rounded px-3 py-2 bg-blue-600 text-white hover:bg-blue-700"
            onClick={() => onResolve('local')}
          >
            Keep Local
          </button>
        </div>
      </div>
    </dialog>
  );
}
