/*
 * SPDX-License-Identifier: MIT
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface DataState {
  useFakeData: boolean;
  setUseFakeData: (useFakeData: boolean) => void;
}

export const useDataStore = create<DataState>()(
  persist(
    (set) => ({
      useFakeData: true,
      setUseFakeData: (useFakeData) => set({ useFakeData }),
    }),
    {
      name: 'data-mode-storage',
    }
  )
);

// -----------------------------
// IndexedDB cache + offline queue
// -----------------------------

import http from '@/lib/http';

// Basic key/value store in IndexedDB. For test environments where
// `indexedDB` isn't available (e.g. jsdom), we fall back to an in-memory
// Map so the logic can still be exercised.
const DB_NAME = 'workpro-cache';
const STORE_NAME = 'kv';

const memoryStore = new Map<string, any>();
const hasIndexedDB = typeof indexedDB !== 'undefined';
let dbPromise: Promise<IDBDatabase> | null = null;

const getDB = (): Promise<IDBDatabase> => {
  if (!hasIndexedDB) {
    // Should never be called in environments without IndexedDB, but keep the
    // type happy.
    return Promise.reject(new Error('IndexedDB not supported'));
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
};

const setItem = async (key: string, value: any) => {
  if (!hasIndexedDB) {
    memoryStore.set(key, value);
    return;
  }
  const db = await getDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(value, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
};

const getItem = async <T>(key: string): Promise<T | undefined> => {
  if (!hasIndexedDB) {
    return memoryStore.get(key) as T | undefined;
  }
  const db = await getDB();
  return new Promise<T | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
};

const deleteItem = async (key: string) => {
  if (!hasIndexedDB) {
    memoryStore.delete(key);
    return;
  }
  const db = await getDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
};

const KEYS = {
  workOrders: 'workOrders',
  assets: 'assets',
  inventory: 'inventory',
  queue: 'queue',
} as const;

// Caching helpers ----------------------------------------------------------

export const cacheWorkOrders = (orders: any[]) => setItem(KEYS.workOrders, orders);
export const getCachedWorkOrders = async () =>
  (await getItem<any[]>(KEYS.workOrders)) ?? [];

export const cacheAssets = (assets: any[]) => setItem(KEYS.assets, assets);
export const getCachedAssets = async () => (await getItem<any[]>(KEYS.assets)) ?? [];

export const cacheInventory = (items: any[]) => setItem(KEYS.inventory, items);
export const getCachedInventory = async () =>
  (await getItem<any[]>(KEYS.inventory)) ?? [];

// Offline queue ------------------------------------------------------------

export type QueuedRequest = {
  method: 'post' | 'put' | 'delete';
  url: string;
  data?: any;
  retries?: number;
  error?: string;
  nextAttempt?: number;
};

export const loadQueue = async (): Promise<QueuedRequest[]> =>
  (await getItem<QueuedRequest[]>(KEYS.queue)) ?? [];

const saveQueue = (queue: QueuedRequest[]) => setItem(KEYS.queue, queue);

export const enqueueRequest = async (req: QueuedRequest) => {
  const queue = await loadQueue();
  queue.push({ ...req, retries: req.retries ?? 0 });
  await saveQueue(queue);
};

export const clearQueue = async () => deleteItem(KEYS.queue);

export const flushQueue = async (
  apiFn: typeof http = http,
  useBackoff = true
) => {
  const queue = await loadQueue();
  if (queue.length === 0) return;
  const now = Date.now();
  const remaining: QueuedRequest[] = [];
  for (const req of queue) {
    if (useBackoff && req.nextAttempt && req.nextAttempt > now) {
      remaining.push(req);
      continue;
    }
    try {
      await apiFn({ method: req.method, url: req.url, data: req.data });
    } catch (err: any) {
      if (err?.response?.status === 409) {
        console.warn('Dropping conflicted request', err);
        continue;
      }
      const retries = (req.retries ?? 0) + 1;
      const backoff = Math.min(1000 * 2 ** (retries - 1), 30000);
      remaining.push({
        ...req,
        retries,
        error: String(err),
        nextAttempt: useBackoff ? now + backoff : undefined,
      });
      continue;
    }
  }

  if (remaining.length > 0) {
    await saveQueue(remaining);
  } else {
    await clearQueue();
  }
};

// Test helper to reset DB between runs
export const __resetForTests = async () => {
  if (hasIndexedDB) {
    if (dbPromise) {
      const db = await dbPromise;
      db.close();
      dbPromise = null;
    }
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase(DB_NAME);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  }
  memoryStore.clear();
};

