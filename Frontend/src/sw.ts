/// <reference lib="webworker" />

import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';

interface QueueItem {
  url: string;
  options?: RequestInit;
}

const offlineQueue: QueueItem[] = [];

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
  }
  if (event.data?.type === 'CLEAR_QUEUE') {
    offlineQueue.length = 0;
  }
});

self.addEventListener('sync', (event) => {
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
    } catch {
      break; // stop if a request fails
    }
  }
}
