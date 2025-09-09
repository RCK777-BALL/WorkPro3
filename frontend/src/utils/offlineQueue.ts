import { emitToast } from '../context/ToastContext';

export type QueuedRequest = {
  method: 'post' | 'put' | 'delete';
  url: string;
  data?: any;
  /** number of times this request has been retried */
  retries?: number;
  /** last error message if a retry failed */
  error?: string;
  /** timestamp after which another attempt should be made */
  nextAttempt?: number;
};

const QUEUE_KEY = 'offline-queue';

export const loadQueue = (): QueuedRequest[] => {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as QueuedRequest[]) : [];
  } catch {
    return [];
  }
};

const saveQueue = (queue: QueuedRequest[]) => {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (err: any) {
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
        } catch (e: any) {
          if (
            !(
              e instanceof DOMException &&
              (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')
            )
          ) {
            console.error('Failed to persist offline queue', e);
            emitToast('Failed to save offline changes; they may be lost', 'error');
            return;
          }
        }
      }
      console.error('Failed to persist offline queue; storage still full');
      emitToast('Failed to save offline changes; they may be lost', 'error');
    } else {
      console.error('Failed to persist offline queue', err);
      emitToast('Failed to save offline changes; they may be lost', 'error');
    }
  }
};

export const addToQueue = (req: QueuedRequest) => {
  const queue = loadQueue();
  queue.push({ ...req, retries: req.retries ?? 0 });
  saveQueue(queue);
};

// Convenience helpers for common resources
import type { Asset, Department, DepartmentHierarchy } from '../types';

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

import http from '../lib/http';

// allow tests to inject a mock http client
type HttpClient = (args: { method: string; url: string; data?: any }) => Promise<any>;
let httpClient: HttpClient = http as unknown as HttpClient;
export const setHttpClient = (client: HttpClient) => {
  httpClient = client;
};

export type DiffEntry = { field: string; local: any; server: any };
export type SyncConflict = {
  method: 'post' | 'put' | 'delete';
  url: string;
  local: any;
  server: any;
  diffs: DiffEntry[];
};

const conflictListeners = new Set<(c: SyncConflict) => void>();
export const onSyncConflict = (cb: (c: SyncConflict) => void) => {
  conflictListeners.add(cb);
  return () => conflictListeners.delete(cb);
};

const diffObjects = (local: any, server: any): DiffEntry[] => {
  const keys = new Set([
    ...Object.keys(local ?? {}),
    ...Object.keys(server ?? {}),
  ]);
  const diffs: DiffEntry[] = [];
  keys.forEach((k) => {
    const l = local?.[k];
    const s = server?.[k];
    if (JSON.stringify(l) !== JSON.stringify(s)) {
      diffs.push({ field: k, local: l, server: s });
    }
  });
  return diffs;
};

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
    } catch (err: any) {
      if (err?.response?.status === 409) {
        try {
          const serverRes = await httpClient({ method: 'get', url: req.url });
          const serverData = serverRes.data;
          const diffs = diffObjects(req.data, serverData);
          conflictListeners.forEach((cb) =>
            cb({ method: req.method, url: req.url, local: req.data, server: serverData, diffs })
          );
        } catch (fetchErr) {
          console.error('Failed to fetch server data for conflict', fetchErr);
        }
        continue;
      }
      console.error('Failed to flush queued request', err);
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
  }

  if (remaining.length > 0) {
    saveQueue(remaining);
  } else {
    clearQueue();
  }
};

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    flushQueue().catch((err) => {
      console.error('Failed to flush queue on online event', err);
    });
  });
}
