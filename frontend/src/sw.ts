/// <reference lib="webworker" />

import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { emitToast } from './context/ToastContext';

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
  } catch {
    emitToast('Failed to load queue from storage', 'error');
    offlineQueue = [];
  }
}

async function saveQueue() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(offlineQueue, 'queue');
    await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(undefined);
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    emitToast('Failed to save queue to storage', 'error');
  }
}

loadQueue().then(() => {
  if (offlineQueue.length > 0) {
    processQueue();
  }
});

declare let self: ServiceWorkerGlobalScope & { __WB_MANIFEST: any };

precacheAndRoute(self.__WB_MANIFEST);

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

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'QUEUE_REQUEST') {
    offlineQueue.push(event.data.payload as QueueItem);
    void saveQueue();
  }
  if (event.data?.type === 'CLEAR_QUEUE') {
    offlineQueue.length = 0;
    void saveQueue();
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
      offlineQueue.shift();
      await saveQueue();
    } catch {
      break; // stop if a request fails
    }
  }
}
