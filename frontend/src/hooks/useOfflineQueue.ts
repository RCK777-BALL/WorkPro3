/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useRef } from 'react';

interface QueueItem {
  url: string;
  options?: RequestInit;
}

/**
 * useOfflineQueue queues network requests made while offline and
 * retries them when connectivity is restored.
 */
export function useOfflineQueue() {
  const queue = useRef<QueueItem[]>([]);

  const processQueue = async () => {
    while (queue.current.length > 0 && navigator.onLine) {
      const { url, options } = queue.current[0];
      try {
        await fetch(url, options);
        queue.current.shift();
      } catch {
        break; // stop processing if a request fails
      }
    }
    localStorage.setItem('offline-queue', JSON.stringify(queue.current));
    if (navigator.serviceWorker.controller && queue.current.length === 0) {
      navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_QUEUE' });
    }
  };

  const enqueue = async (url: string, options?: RequestInit) => {
    const item = { url, options };
    if (navigator.onLine) {
      fetch(url, options).catch(() => {
        queue.current.push(item);
        localStorage.setItem('offline-queue', JSON.stringify(queue.current));
      });
    } else {
      queue.current.push(item);
      localStorage.setItem('offline-queue', JSON.stringify(queue.current));

      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        const sync = (reg as ServiceWorkerRegistration).sync;
        if (sync && typeof sync.register === 'function') {
          await sync.register('offline-wo-sync');
        } else {
          // Fallback: queue locally and flush on focus/online
        }
      }
    }
  };

  useEffect(() => {
    const stored = localStorage.getItem('offline-queue');
    if (stored) {
      queue.current = JSON.parse(stored);
      processQueue();
    }
    window.addEventListener('online', processQueue);
    return () => window.removeEventListener('online', processQueue);
  }, []);

  return { enqueue };
}
