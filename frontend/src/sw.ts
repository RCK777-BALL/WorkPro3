/*
 * SPDX-License-Identifier: MIT
 */

/// <reference lib="webworker" />

import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';


interface QueueItem {
  url: string;
  options?: RequestInit;
}

interface SyncEvent extends ExtendableEvent {
  readonly tag: string;
}

declare global {
  interface ServiceWorkerGlobalScopeEventMap {
    sync: SyncEvent;
  }
}

const DB_NAME = 'offline-queue';
const STORE_NAME = 'requests';
const API_CACHE_NAME = 'offline-api';
const RUNTIME_CACHE_NAME = 'offline-runtime';
const DATA_ENDPOINTS = [
  '/api/workorders',
  '/api/workorders/offline',
  '/api/workorders/mobile',
  '/api/pm',
  '/api/pm/offline',
  '/api/checklists',
  '/api/parts',
  '/api/assets',
];
let offlineQueue: QueueItem[] = [];

async function openDB() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
 
async function loadQueue() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get('queue');
    const result: QueueItem[] = await new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
    offlineQueue = result;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to load queue from storage', err);
    offlineQueue = [];
  }
}

// duplicate loadQueue removed because an implementation with error handling exists above

async function saveQueue() {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).put(offlineQueue, 'queue');
  await new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(undefined);
    tx.onerror = () => reject(tx.error);
  });
}

void (async () => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(offlineQueue, 'queue');
    await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(undefined);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to seed offline queue store', err);
  }
})();

loadQueue().then(() => {
  if (offlineQueue.length > 0) {
    processQueue();
  }
});

declare let self: ServiceWorkerGlobalScope & { __WB_MANIFEST: unknown };

if (self.__WB_MANIFEST) {
  precacheAndRoute(self.__WB_MANIFEST);
} else {
  // eslint-disable-next-line no-console
  console.warn('No precache manifest found. Skipping precache.');
}

// Cache page navigations (html) with a Network First strategy
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new NetworkFirst({ cacheName: 'pages' })
);

// Cache CSS, JS, and worker requests with a Stale While Revalidate strategy
registerRoute(
  ({ request }) => ['style', 'script', 'worker'].includes(request.destination),
  new StaleWhileRevalidate({ cacheName: 'assets' })
);

// Cache images with a Cache First strategy
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({ cacheName: 'images' })
);

// Cache key API endpoints required for worker mode usage
registerRoute(
  ({ url, request }) =>
    request.method === 'GET' &&
    DATA_ENDPOINTS.some((path) => url.pathname.startsWith(path)),
  new NetworkFirst({ cacheName: API_CACHE_NAME })
);

registerRoute(
  ({ request }) => request.destination === 'font' || request.destination === 'audio',
  new StaleWhileRevalidate({ cacheName: RUNTIME_CACHE_NAME })
);

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'QUEUE_REQUEST') {
    offlineQueue.push(event.data.payload as QueueItem);
    saveQueue().catch((err) => {
      // eslint-disable-next-line no-console
      console.error('Failed to save queue to storage', err);
      void notifyClients('SAVE_QUEUE_ERROR', err);
    });
  }
  if (event.data?.type === 'CLEAR_QUEUE') {
    offlineQueue.length = 0;
    saveQueue().catch((err) => {
      // eslint-disable-next-line no-console
      console.error('Failed to save queue to storage', err);
      void notifyClients('SAVE_QUEUE_ERROR', err);
    });
  }
  if (event.data?.type === 'CACHE_OFFLINE_DATA') {
    event.waitUntil(cacheOfflineData(event.data.payload?.urls ?? DATA_ENDPOINTS));
  }
});

self.addEventListener('sync', (event: SyncEvent) => {
  if (event.tag === 'offline-queue') {
    event.waitUntil(processQueue());
  }
});

async function processQueue() {
  while (offlineQueue.length > 0) {
    const { url, options } = offlineQueue[0];
    try {
      await fetch(url, options);
    } catch {
      break; // stop if a request fails
    }
    offlineQueue.shift();
    try {
      await saveQueue();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to save queue to storage', err);
      await notifyClients('SAVE_QUEUE_ERROR', err);
      break;
    }
  }
}

async function cacheOfflineData(urls: string[]) {
  try {
    const cache = await caches.open(API_CACHE_NAME);
    await Promise.all(
      urls.map(async (url) => {
        try {
          const response = await fetch(url);
          if (response.ok) {
            await cache.put(url, response.clone());
          }
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn('Failed to cache offline data', err);
        }
      })
    );
    await notifyClients('OFFLINE_CACHE_READY', { urls });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to warm offline cache', err);
    await notifyClients('OFFLINE_CACHE_ERROR', err);
  }
}

async function notifyClients(type: string, payload: unknown): Promise<void> {
  try {
    const windowClients = await self.clients.matchAll({
      includeUncontrolled: true,
      type: 'window',
    });

    await Promise.all(
      windowClients.map(async (client) => {
        try {
          client.postMessage({ type, payload });
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error('Failed to notify client', err);
        }
      }),
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to broadcast message to clients', err);
  }
}

