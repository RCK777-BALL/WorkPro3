/*
 * SPDX-License-Identifier: MIT
 */

import { emitToast } from '@/context/ToastContext';
import {
  flushQueue,
  getQueueLength,
  loadQueue,
  MAX_QUEUE_RETRIES,
  onQueueChange,
  onItemStatusChange,
  onSyncConflict,
  type SyncConflict,
  type SyncItemStatus,
  type SyncStatusUpdate,
} from '@/utils/offlineQueue';
import { useSyncStore } from '@/store/syncStore';

class SyncManager {
  private syncing = false;
  private initialized = false;
  private unsubscribers: Array<() => void> = [];
  private toastCooldowns = new Map<string, number>();
  private clearTimers = new Map<string, number>();

  private hydrateQueueState() {
    const queue = loadQueue();
    const statusMap = queue.reduce<Record<string, SyncItemStatus>>((acc, item) => {
      const status: SyncItemStatus =
        item.nextAttempt && item.nextAttempt > Date.now() ? 'retrying' : 'pending';
      if (item.id) {
        acc[item.id] = status;
      }
      return acc;
    }, {});
    useSyncStore.getState().setQueueState(queue.length);
    useSyncStore.getState().hydrateItemStatuses(statusMap);
  }

  private maybeToast(key: string, message: string, variant: 'success' | 'error' = 'success') {
    const now = Date.now();
    const last = this.toastCooldowns.get(key) ?? 0;
    if (now - last < 3500) return;
    this.toastCooldowns.set(key, now);
    emitToast(message, variant);
  }

  private handleStatusUpdate(id: string, update: SyncStatusUpdate) {
    useSyncStore.getState().setItemStatus(id, update.status);

    if (update.status === 'retrying') {
      const delayMs = update.nextAttempt ? Math.max(update.nextAttempt - Date.now(), 0) : 0;
      const seconds = Math.ceil(delayMs / 1000);
      const delayLabel = seconds ? ` in ${seconds}s` : '';
      this.maybeToast(`retry-${id}`, `Retry scheduled${delayLabel}`);
    }

    if (update.status === 'failed') {
      this.maybeToast(
        `fail-${id}`,
        update.error
          ? `Sync failed: ${update.error}`
          : `Sync failed after ${MAX_QUEUE_RETRIES} attempts`,
        'error',
      );
    }

    if (update.status === 'synced') {
      const existing = this.clearTimers.get(id);
      if (existing) {
        window.clearTimeout(existing);
      }
      const timer = window.setTimeout(() => {
        useSyncStore.getState().clearItemStatus(id);
        this.clearTimers.delete(id);
      }, 1500);
      this.clearTimers.set(id, timer);
    }
  }

  init() {
    if (this.initialized) return;
    this.initialized = true;
    this.hydrateQueueState();
    useSyncStore.getState().setOffline(!navigator.onLine);

    const handleOnline = () => {
      useSyncStore.getState().setOffline(false);
      void this.sync();
    };
    const handleOffline = () => {
      useSyncStore.getState().setOffline(true);
      this.hydrateQueueState();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    this.unsubscribers.push(() => window.removeEventListener('online', handleOnline));
    this.unsubscribers.push(() => window.removeEventListener('offline', handleOffline));

    const unsubQueue = onQueueChange((size) => {
      const processed = useSyncStore.getState().processed;
      useSyncStore.getState().setQueueState(size, processed > size ? size : processed);
    });
    this.unsubscribers.push(unsubQueue);

    const unsubStatuses = onItemStatusChange((id: string, update: SyncStatusUpdate) => {
      this.handleStatusUpdate(id, update);
    });
    this.unsubscribers.push(unsubStatuses);

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
