/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, WifiOff } from 'lucide-react';

import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import { syncManager } from '@/utils/syncManager';
import { loadQueue, onQueueChange, type QueuedRequest } from '@/utils/offlineQueue';
import { useSyncStore } from '@/store/syncStore';

const isWorkOrderRequest = (item: QueuedRequest) =>
  item.meta?.entityType === 'workorder' ||
  item.url.includes('/workorders') ||
  item.url.includes('/work-orders');

const buildLabel = (item: QueuedRequest) => {
  const description = item.meta?.description;
  if (description) return description;
  return `${item.method.toUpperCase()} ${item.url}`;
};

interface WorkOrderQueuePanelProps {
  workOrderId?: string;
}

const WorkOrderQueuePanel = ({ workOrderId }: WorkOrderQueuePanelProps) => {
  const [queue, setQueue] = useState<QueuedRequest[]>([]);
  const offline = useSyncStore((state) => state.offline);
  const status = useSyncStore((state) => state.status);
  const itemStatuses = useSyncStore((state) => state.itemStatuses);
  const conflict = useSyncStore((state) => state.conflict);

  useEffect(() => {
    const hydrate = () => setQueue(loadQueue());
    hydrate();
    const unsub = onQueueChange(hydrate);
    return () => {
      unsub();
    };
  }, []);

  const queuedWorkOrders = useMemo(() => {
    return queue.filter((item) => {
      if (!isWorkOrderRequest(item)) return false;
      if (!workOrderId) return true;
      return item.meta?.entityId === workOrderId || item.url.includes(workOrderId);
    });
  }, [queue, workOrderId]);

  const hasQueued = queuedWorkOrders.length > 0;
  const isSyncing = status === 'syncing';

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-neutral-900">Offline updates</h2>
          <p className="text-sm text-neutral-500">
            {hasQueued
              ? `${queuedWorkOrders.length} update${queuedWorkOrders.length === 1 ? '' : 's'} waiting to sync.`
              : 'No offline work order updates queued.'}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => void syncManager.sync()}
          disabled={offline || !hasQueued || isSyncing}
          className="flex items-center gap-2"
        >
          {offline ? <WifiOff className="h-4 w-4" /> : <RefreshCw className={isSyncing ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />}
          {offline ? 'Offline' : isSyncing ? 'Syncing…' : 'Replay queue'}
        </Button>
      </div>

      {conflict && isWorkOrderRequest({ method: conflict.method, url: conflict.url }) && (
        <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          A work order update is in conflict. Resolve it before syncing the remaining queue.
        </div>
      )}

      {hasQueued && (
        <ul className="mt-4 space-y-2">
          {queuedWorkOrders.map((item) => {
            const statusLabel = item.id ? itemStatuses[item.id] ?? 'pending' : 'pending';
            return (
              <li
                key={item.id ?? `${item.method}-${item.url}`}
                className="flex flex-col gap-2 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-neutral-800">{buildLabel(item)}</p>
                  {item.nextAttempt && statusLabel === 'retrying' && (
                    <p className="text-xs text-neutral-500">
                      Retry after {new Date(item.nextAttempt).toLocaleTimeString()}
                    </p>
                  )}
                </div>
                <Badge text={statusLabel} size="sm" />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default WorkOrderQueuePanel;
