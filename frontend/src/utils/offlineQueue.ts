import { emitToast } from '../context/ToastContext';
import { safeLocalStorage } from '@/utils/safeLocalStorage';
import type { TechnicianPartUsagePayload, TechnicianStatePayload } from '@/api/technician';
 

export type SyncItemStatus = 'pending' | 'in-progress' | 'synced' | 'retrying' | 'failed';

export interface QueuedRequest<T = unknown> {
  id?: string;
  method: 'post' | 'put' | 'delete';
  url: string;
  data?: T;
  /** number of times this request has been retried */
  retries?: number;
  /** last error message if a retry failed */
  error?: string;
  /** timestamp after which another attempt should be made */
  nextAttempt?: number;
  meta?: {
    entityType?: string;
    entityId?: string;
    description?: string;
  };
}

const QUEUE_KEY = 'offline-queue';
export const MAX_QUEUE_RETRIES = 5;
export interface SyncStatusUpdate {
  status: SyncItemStatus;
  nextAttempt?: number;
  error?: string;
}

const statusListeners = new Set<(id: string, update: SyncStatusUpdate) => void>();
export const onItemStatusChange = (listener: (id: string, update: SyncStatusUpdate) => void) => {
  statusListeners.add(listener);
  return () => statusListeners.delete(listener);
};

const notifyStatus = (id: string, update: SyncStatusUpdate) => {
  statusListeners.forEach((cb) => cb(id, update));
};

const generateRequestId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const queueListeners = new Set<(size: number) => void>();
export const onQueueChange = (listener: (size: number) => void) => {
  queueListeners.add(listener);
  return () => queueListeners.delete(listener);
};

const notifyQueue = <T = unknown>(queue: QueuedRequest<T>[]) => {
  queueListeners.forEach((cb) => cb(queue.length));
};

export const loadQueue = <T = unknown>(): QueuedRequest<T>[] => {
  try {
    const raw = safeLocalStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as QueuedRequest<T>[];
    let needsSave = false;
    const withIds = parsed.map((entry) => {
      if (entry.id) return entry;
      needsSave = true;
      return { ...entry, id: generateRequestId() };
    });
    if (needsSave) {
      saveQueue(withIds);
    }
    return withIds;
  } catch {
    return [];
  }
};

const saveQueue = <T = unknown>(queue: QueuedRequest<T>[]) => {
  try {
    safeLocalStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    notifyQueue(queue);
  } catch (err: unknown) {
    if (
      err instanceof DOMException &&
      (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED')
    ) {
      emitToast(
        'Offline storage full; oldest offline changes were discarded',
        'error'
      );
      const trimmed = [...queue];
      while (trimmed.length > 0) {
        trimmed.shift();
        try {
          safeLocalStorage.setItem(QUEUE_KEY, JSON.stringify(trimmed));
          notifyQueue(trimmed);
          return;
        } catch (e: unknown) {
          if (
            !(
              e instanceof DOMException &&
              (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')
            )
          ) {

            emitToast('Failed to save offline changes; they may be lost', 'error');
            return;
          }
        }
      }
      emitToast('Failed to save offline changes; they may be lost', 'error');
    } else {

      emitToast('Failed to save offline changes; they may be lost', 'error');
    }
  }
};

export const addToQueue = <T = unknown>(req: QueuedRequest<T>) => {
  const queue = loadQueue<T>();
  queue.push({ ...req, id: req.id ?? generateRequestId(), retries: req.retries ?? 0 });
  saveQueue(queue);
};

// Convenience helpers for common resources
import type { Asset, Department, DepartmentHierarchy } from '@/types';

export const enqueueAssetRequest = (
  method: 'post' | 'put' | 'delete',
  asset: Asset
) => {
  const url = method === 'post' ? '/assets' : `/assets/${asset.id}`;
  addToQueue({ method, url, data: asset });
};

export const enqueueDepartmentRequest = (
  method: 'post' | 'put' | 'delete',
  department: Department | DepartmentHierarchy
) => {
  const url = method === 'post' ? '/departments' : `/departments/${department.id}`;
  addToQueue({ method, url, data: department });
};

export const enqueueTechnicianStateRequest = (
  workOrderId: string,
  payload: TechnicianStatePayload,
) => {
  addToQueue({ method: 'post', url: `/technician/work-orders/${workOrderId}/state`, data: payload });
};

export const enqueueTechnicianPartUsageRequest = (
  workOrderId: string,
  payload: TechnicianPartUsagePayload,
) => {
  addToQueue({ method: 'post', url: `/technician/work-orders/${workOrderId}/parts`, data: payload });
};

export const enqueueWorkOrderUpdate = (
  workOrderId: string,
  data: Record<string, unknown>,
) => {
  const description =
    typeof data.status === 'string'
      ? `Status → ${data.status}`
      : typeof data.priority === 'string'
        ? `Priority → ${data.priority}`
        : 'Work order update';
  const stampedData = {
    ...data,
    clientUpdatedAt: data.clientUpdatedAt ?? new Date().toISOString(),
  };
  addToQueue({
    method: 'put',
    url: `/work-orders/${workOrderId}/reconcile`,
    data: stampedData,
    meta: { entityType: 'workorder', entityId: workOrderId, description },
  });
};

export const enqueueMeterReading = (meterId: string, value: number) => {
  addToQueue({
    method: 'post',
    url: `/meters/${meterId}/readings`,
    data: { value },
    meta: { entityType: 'meter', entityId: meterId },
  });
};

export const clearQueue = () => {
  notifyQueue([]);
  safeLocalStorage.removeItem(QUEUE_KEY);
};
export const getQueueLength = () => loadQueue().length;

export const retryFailedRequests = () => {
  const queue = loadQueue();
  const retriable = queue.map((item) => {
    if ((item.retries ?? 0) < MAX_QUEUE_RETRIES) return item;
    return {
      ...item,
      retries: Math.max(0, MAX_QUEUE_RETRIES - 1),
      error: undefined,
      nextAttempt: undefined,
    };
  });
  saveQueue(retriable);
  return retriable.length;
};

import http from '@/lib/http';

type HttpClientResponse = { data?: unknown } | void;
// allow tests to inject a mock http client
type HttpClient = (args: { method: string; url: string; data?: unknown }) => Promise<HttpClientResponse>;
let httpClient: HttpClient = http as unknown as HttpClient;
export const setHttpClient = (client: HttpClient) => {
  httpClient = client;
};

export interface DiffEntry<T = unknown> {
  field: string;
  local: T;
  server: T;
}
export interface SyncConflict<T = unknown> {
  method: 'post' | 'put' | 'delete';
  url: string;
  local: T;
  server: T;
  diffs: DiffEntry<T>[];
}

const conflictListeners = new Set<(c: SyncConflict) => void>();
export const onSyncConflict = (
  cb: (c: SyncConflict) => void
): (() => void) => {
  conflictListeners.add(cb);
  return () => {
    conflictListeners.delete(cb);
  };
};

const isObjectLike = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const deepEqualInternal = (
  a: unknown,
  b: unknown,
  visited: WeakMap<object, WeakSet<object>>
): boolean => {
  if (Object.is(a, b)) {
    return true;
  }

  if (!isObjectLike(a) || !isObjectLike(b)) {
    return false;
  }

  const objectA = a as object;
  const objectB = b as object;

  const seenB = visited.get(objectA);
  if (seenB?.has(objectB)) {
    return true;
  }

  const updated = seenB ?? new WeakSet<object>();
  if (!seenB) {
    visited.set(objectA, updated);
  }
  updated.add(objectB);

  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
      return false;
    }

    for (let i = 0; i < a.length; i += 1) {
      if (!deepEqualInternal(a[i], b[i], visited)) {
        return false;
      }
    }
    return true;
  }

  const recordA = a as Record<string, unknown>;
  const recordB = b as Record<string, unknown>;

  const keysA = Object.keys(recordA);
  const keysB = Object.keys(recordB);

  if (keysA.length !== keysB.length) {
    return false;
  }

  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(recordB, key)) {
      return false;
    }
    if (!deepEqualInternal(recordA[key], recordB[key], visited)) {
      return false;
    }
  }

  return true;
};

const deepEqual = (
  a: unknown,
  b: unknown,
  visited: WeakMap<object, WeakSet<object>> = new WeakMap<object, WeakSet<object>>()
): boolean => deepEqualInternal(a, b, visited);

export const diffObjects = (
  local: Record<string, unknown>,
  server: Record<string, unknown>
): DiffEntry[] => {
  const ignoredFields = new Set(['clientUpdatedAt']);
  const keys = new Set([
    ...Object.keys(local ?? {}),
    ...Object.keys(server ?? {}),
  ].filter((key) => !ignoredFields.has(key)));
  const diffs: DiffEntry[] = [];
  keys.forEach((k) => {
    const l = local?.[k];
    const s = server?.[k];
    const initialVisited =
      isObjectLike(local) && isObjectLike(server)
        ? (() => {
            const map = new WeakMap<object, WeakSet<object>>();
            const set = new WeakSet<object>();
            set.add(server as object);
            map.set(local as object, set);
            return map;
          })()
        : new WeakMap<object, WeakSet<object>>();
    if (!deepEqual(l, s, initialVisited)) {
      diffs.push({ field: k, local: l, server: s });
    }
  });
  return diffs;
};
let isFlushing = false;

const resolveConflictFetchUrl = (req: QueuedRequest) => {
  if (req.meta?.entityType === 'workorder' && req.meta.entityId) {
    return `/workorders/${req.meta.entityId}`;
  }
  return req.url;
};

export const flushQueue = async (
  useBackoff = true,
  onProgress?: (processed: number, remaining: number) => void,
) => {
  if (isFlushing) return;
  isFlushing = true;

  try {
    const queue = loadQueue();
    if (queue.length === 0) return;

    const now = Date.now();
    const remaining: QueuedRequest[] = [];
    let processed = 0;

    for (let i = 0; i < queue.length; i += 1) {
      const req = queue[i];
      const requestId = req.id ?? generateRequestId();
      if (!req.id) {
        req.id = requestId;
      }
      if (useBackoff && req.nextAttempt && req.nextAttempt > now) {
        remaining.push(req);
        notifyStatus(requestId, { status: 'retrying', nextAttempt: req.nextAttempt, error: req.error });
        onProgress?.(processed, remaining.length + (queue.length - i - 1));
        continue;
      }
      notifyStatus(requestId, { status: 'in-progress' });
      try {
        await httpClient({ method: req.method, url: req.url, data: req.data });
      } catch (err: unknown) {
        if ((err as { response?: { status?: number } })?.response?.status === 409) {
          try {
            const serverRes = await httpClient({ method: 'get', url: resolveConflictFetchUrl(req) });
            const serverData = (serverRes?.data ?? {}) as Record<string, unknown>;
            const diffs = diffObjects(
              req.data as Record<string, unknown>,
              serverData
            );
            conflictListeners.forEach((cb) =>
              cb({ method: req.method, url: req.url, local: req.data, server: serverData, diffs })
            );
          } catch {
            emitToast('Failed to fetch server data for conflict', 'error');

          }
        }
        emitToast('Failed to flush queued request', 'error');

        const retries = (req.retries ?? 0) + 1;
        const backoff = Math.min(1000 * 2 ** (retries - 1), 30000);
        const rest = { ...req };
        delete rest.nextAttempt;
        const retryRequest: QueuedRequest = {
          ...rest,
          id: requestId,
          retries,
          error: String(err),
        };
        if (useBackoff) {
          retryRequest.nextAttempt = now + backoff;
        }
        notifyStatus(requestId, {
          status: retries >= MAX_QUEUE_RETRIES ? 'failed' : 'retrying',
          nextAttempt: retryRequest.nextAttempt,
          error: retryRequest.error,
        });
        remaining.push(retryRequest);
        processed += 1;
        onProgress?.(processed, remaining.length + (queue.length - i - 1));
        continue; // continue processing remaining requests

      }

      notifyStatus(requestId, { status: 'synced' });
      const toPersist = [...remaining, ...queue.slice(i + 1)];
      if (toPersist.length > 0) {
        saveQueue(toPersist);
      } else {
        clearQueue();
      }

      processed += 1;
      onProgress?.(processed, toPersist.length);

    }
  } finally {
    isFlushing = false;
  }
};

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    flushQueue().catch(() => {
      emitToast('Failed to flush queued request', 'error');

    });
  });
}
