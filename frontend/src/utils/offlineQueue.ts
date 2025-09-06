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
  } catch (err) {
    console.error('Failed to persist offline queue', err);
    emitToast('Failed to save offline changes; they may be lost', 'error');
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

import api from '../lib/api';

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
      await api({ method: req.method, url: req.url, data: req.data });
    } catch (err: any) {
      if (err?.response?.status === 409) {
        console.warn('Dropping conflicted request', err);
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
