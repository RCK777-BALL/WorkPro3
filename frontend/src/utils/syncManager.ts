/*
 * SPDX-License-Identifier: MIT
 */

import { emitToast } from '@/context/ToastContext';
import {
  flushQueue,
  getQueueLength,
  loadQueue,
  onQueueChange,
  onSyncConflict,
  type SyncConflict,
} from '@/utils/offlineQueue';
import { useSyncStore } from '@/store/syncStore';

class SyncManager {
  private syncing = false;
  private initialized = false;
  private unsubscribers: Array<() => void> = [];

  init() {
    if (this.initialized) return;
    this.initialized = true;
    useSyncStore.getState().setQueueState(getQueueLength());
    useSyncStore.getState().setOffline(!navigator.onLine);

    const handleOnline = () => {
      useSyncStore.getState().setOffline(false);
      void this.sync();
    };
    const handleOffline = () => useSyncStore.getState().setOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    this.unsubscribers.push(() => window.removeEventListener('online', handleOnline));
    this.unsubscribers.push(() => window.removeEventListener('offline', handleOffline));

    const unsubQueue = onQueueChange((size) => {
      const processed = useSyncStore.getState().processed;
      useSyncStore.getState().setQueueState(size, processed > size ? size : processed);
    });
    this.unsubscribers.push(unsubQueue);

    const unsubConflict = onSyncConflict((conflict: SyncConflict) => {
      useSyncStore.getState().setConflict(conflict);
    });
    this.unsubscribers.push(unsubConflict);

    if (navigator.onLine) {
      void this.sync();
    }
  }

  teardown() {
    this.unsubscribers.forEach((cb) => cb());
    this.unsubscribers = [];
    this.initialized = false;
  }

  async sync() {
    if (this.syncing || !navigator.onLine) return;
    const total = loadQueue().length;
    useSyncStore.getState().setQueueState(total, 0);
    if (total === 0) {
      useSyncStore.getState().setStatus('idle');
      return;
    }

    this.syncing = true;
    useSyncStore.getState().setStatus('syncing');
    try {
      await flushQueue(true, (processed, remaining) => {
        useSyncStore.getState().setQueueState(remaining, processed);
      });
      useSyncStore.getState().setStatus('idle');
      useSyncStore.getState().setLastSynced(Date.now());
      useSyncStore.getState().setQueueState(getQueueLength(), 0);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to sync offline changes';
      useSyncStore.getState().setStatus('error', message);
      emitToast(message, 'error');
    } finally {
      this.syncing = false;
    }
  }
}

export const syncManager = new SyncManager();
