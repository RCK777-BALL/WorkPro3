import { listQueue, updateAction, type OfflineAction } from './queue';
import { syncOfflineActions } from '../api/endpoints/offline';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type SyncResult = { id: string; status: string; error?: string };

const isSyncResult = (value: Record<string, unknown>): value is SyncResult => (
  typeof value.id === 'string' &&
  typeof value.status === 'string' &&
  (value.error === undefined || typeof value.error === 'string')
);

export const syncQueue = async () => {
  const queue = listQueue();
  if (!queue.length) return;

  const payload = queue.map((action) => ({
    id: action.id,
    entityType: action.entityType,
    operation: action.operation,
    payload: action.payload,
    idempotencyKey: action.idempotencyKey,
  }));

  try {
    const response = await syncOfflineActions(payload);
    response.results.forEach((result) => {
      if (!isSyncResult(result)) return;
      updateAction(result.id, {
        status: result.status === 'ok' ? 'succeeded' : 'failed',
        lastError: result.error,
      });
    });
  } catch (error) {
    queue.forEach((action) => {
      const attempts = action.attempts + 1;
      updateAction(action.id, {
        attempts,
        status: 'failed',
        lastError: error instanceof Error ? error.message : 'Sync failed',
      });
    });

    await delay(1000);
  }
};

export const retryFailed = async () => {
  const queue = listQueue();
  queue
    .filter((action) => action.status === 'failed')
    .forEach((action) => updateAction(action.id, { status: 'pending' }));
  await syncQueue();
};

export const hasPendingActions = (queue: OfflineAction[]) => queue.some((action) => action.status === 'pending');
