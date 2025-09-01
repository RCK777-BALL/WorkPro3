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
  };

  const enqueue = (url: string, options?: RequestInit) => {
    if (navigator.onLine) {
      fetch(url, options).catch(() => {
        queue.current.push({ url, options });
        localStorage.setItem('offline-queue', JSON.stringify(queue.current));
      });
    } else {
      queue.current.push({ url, options });
      localStorage.setItem('offline-queue', JSON.stringify(queue.current));
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
