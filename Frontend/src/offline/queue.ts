export type OfflineActionStatus = 'pending' | 'succeeded' | 'failed';

export interface OfflineAction {
  id: string;
  entityType: string;
  operation: string;
  payload: Record<string, unknown>;
  idempotencyKey: string;
  status: OfflineActionStatus;
  attempts: number;
  lastError?: string;
}

const STORAGE_KEY = 'workpro.offline.queue';

const readQueue = (): OfflineAction[] => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as OfflineAction[];
  } catch {
    return [];
  }
};

const writeQueue = (queue: OfflineAction[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
};

export const enqueueAction = (action: Omit<OfflineAction, 'status' | 'attempts'>) => {
  const queue = readQueue();
  queue.push({ ...action, status: 'pending', attempts: 0 });
  writeQueue(queue);
};

export const updateAction = (id: string, patch: Partial<OfflineAction>) => {
  const queue = readQueue();
  const next = queue.map((item) => (item.id === id ? { ...item, ...patch } : item));
  writeQueue(next);
};

export const listQueue = () => readQueue();

export const clearQueue = () => writeQueue([]);
