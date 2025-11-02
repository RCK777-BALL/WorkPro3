/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useRef } from 'react';

import { safeLocalStorage } from '@/utils/safeLocalStorage';

interface QueueItem {
  url: string;
  options?: RequestInit;
}

type SyncCapableRegistration = ServiceWorkerRegistration & {
  sync?: { register(tag: string): Promise<void> };
};

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
    safeLocalStorage.setItem('offline-queue', JSON.stringify(queue.current));
    if (navigator.serviceWorker.controller && queue.current.length === 0) {
      navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_QUEUE' });
    }
  };

  const enqueue = async (url: string, options?: RequestInit) => {
    const item: QueueItem = options ? { url, options } : { url };
    if (navigator.onLine) {
      fetch(url, options).catch(() => {
        queue.current.push(item);
        safeLocalStorage.setItem('offline-queue', JSON.stringify(queue.current));
      });
    } else {
      queue.current.push(item);
      safeLocalStorage.setItem('offline-queue', JSON.stringify(queue.current));

      if ('serviceWorker' in navigator) {
        const reg = (await navigator.serviceWorker.ready) as SyncCapableRegistration;
        const sync = reg.sync;
        if (sync && typeof sync.register === 'function') {
          await sync.register('offline-queue');
        } else {
          // Fallback: queue locally and flush on focus/online
        }
      }
    }
  };

  useEffect(() => {
    const stored = safeLocalStorage.getItem('offline-queue');
    if (stored) {
      queue.current = JSON.parse(stored);
      processQueue();
    }
    window.addEventListener('online', processQueue);
    return () => window.removeEventListener('online', processQueue);
  }, []);

  return { enqueue };
}
