 import { emitToast } from '../context/ToastContext';
import { logError } from './logger';
 

export interface QueuedRequest<T = unknown> {
  method: 'post' | 'put' | 'delete';
  url: string;
  data?: T;
  /** number of times this request has been retried */
  retries?: number;
  /** last error message if a retry failed */
  error?: string;
  /** timestamp after which another attempt should be made */
  nextAttempt?: number;
}

const QUEUE_KEY = 'offline-queue';
export const MAX_QUEUE_RETRIES = 5;

export const loadQueue = <T = unknown>(): QueuedRequest<T>[] => {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as QueuedRequest<T>[]) : [];
  } catch {
    return [];
  }
};

const saveQueue = <T = unknown>(queue: QueuedRequest<T>[]) => {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
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
          localStorage.setItem(QUEUE_KEY, JSON.stringify(trimmed));
          return;
        } catch (e: unknown) {
          if (
            !(
              e instanceof DOMException &&
              (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')
            )
          ) {
            logError('Failed to persist offline queue', e);
            emitToast('Failed to save offline changes; they may be lost', 'error');
            return;
          }
        }
      }
      logError('Failed to persist offline queue; storage still full');
      emitToast('Failed to save offline changes; they may be lost', 'error');
    } else {
      logError('Failed to persist offline queue', err);
      emitToast('Failed to save offline changes; they may be lost', 'error');
    }
  }
};

export const addToQueue = <T = unknown>(req: QueuedRequest<T>) => {
  const queue = loadQueue<T>();
  queue.push({ ...req, retries: req.retries ?? 0 });
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

export const clearQueue = () => localStorage.removeItem(QUEUE_KEY);

import http from '@/lib/http';

// allow tests to inject a mock http client
type HttpClient = (args: { method: string; url: string; data?: unknown }) => Promise<unknown>;
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

 const diffObjects = (
  local: Record<string, unknown>,
  server: Record<string, unknown>
): DiffEntry[] => {
 
  const keys = new Set([
    ...Object.keys(local ?? {}),
    ...Object.keys(server ?? {}),
  ]);
  const diffs: DiffEntry[] = [];
  keys.forEach((k) => {
    const l = local?.[k];
    const s = server?.[k];
    if (!deepEqual(l, s)) {
      diffs.push({ field: k, local: l, server: s });
    }
  });
  return diffs;
};
let isFlushing = false;

export const flushQueue = async (useBackoff = true) => {
   const queue = loadQueue();
  if (queue.length === 0) return;

  const now = Date.now();
  const remaining: QueuedRequest[] = [];

  for (const req of queue) {
    if (useBackoff && req.nextAttempt && req.nextAttempt > now) {
      remaining.push(req);
      continue;
    }
    try {
      await httpClient({ method: req.method, url: req.url, data: req.data });
    } catch (err: unknown) {
      if ((err as { response?: { status?: number } })?.response?.status === 409) {
        try {
          const serverRes = await httpClient({ method: 'get', url: req.url });
          const serverData = serverRes.data as Record<string, unknown>;
          const diffs = diffObjects(
            req.data as Record<string, unknown>,
            serverData
          );
          conflictListeners.forEach((cb) =>
            cb({ method: req.method, url: req.url, local: req.data, server: serverData, diffs })
          );
        } catch (fetchErr: unknown) {
          logError('Failed to fetch server data for conflict', fetchErr);
 
        }
      }
       logError('Failed to flush queued request', err);
      const retries = (req.retries ?? 0) + 1;
      const backoff = Math.min(1000 * 2 ** (retries - 1), 30000);
      remaining.push({
        ...req,
        retries,
        error: String(err),
        nextAttempt: useBackoff ? now + backoff : undefined,
      });
      continue; // continue processing remaining requests
 
    }

    const toPersist = [...remaining, ...queue.slice(i + 1)];
    if (toPersist.length > 0) {
      saveQueue(toPersist);
    } else {
      clearQueue();
    }
 
  }
};

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    flushQueue().catch((err: unknown) => {
      logError('Failed to flush queue on online event', err);
    });
  });
}
