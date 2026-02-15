import React, { useMemo } from 'react';
import { listQueue } from '../queue';
import { retryFailed, syncQueue } from '../sync';

const SyncStatus: React.FC = () => {
  const queue = useMemo(() => listQueue(), []);
  const pending = queue.filter((action) => action.status === 'pending').length;
  const failed = queue.filter((action) => action.status === 'failed').length;
  const succeeded = queue.filter((action) => action.status === 'succeeded').length;

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4 text-sm">
      <p className="font-medium text-neutral-900">Offline Sync</p>
      <div className="mt-2 space-y-1 text-neutral-600">
        <p>Pending: {pending}</p>
        <p>Failed: {failed}</p>
        <p>Succeeded: {succeeded}</p>
      </div>
      <div className="mt-4 flex gap-2">
        <button className="rounded border border-neutral-300 px-3 py-1" onClick={() => syncQueue()}>
          Sync now
        </button>
        <button className="rounded border border-neutral-300 px-3 py-1" onClick={() => retryFailed()}>
          Retry failed
        </button>
      </div>
    </div>
  );
};

export default SyncStatus;
