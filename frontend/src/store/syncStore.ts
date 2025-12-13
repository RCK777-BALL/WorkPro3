/*
 * SPDX-License-Identifier: MIT
 */

import { create } from 'zustand';
import type { SyncConflict, SyncItemStatus } from '@/utils/offlineQueue';

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'conflicted';

interface SyncState {
  offline: boolean;
  queued: number;
  processed: number;
  status: SyncStatus;
  itemStatuses: Record<string, SyncItemStatus>;
  lastSyncedAt?: number;
  error?: string | null;
  conflict?: SyncConflict | null;
  setOffline: (offline: boolean) => void;
  setQueueState: (queued: number, processed?: number) => void;
  setStatus: (status: SyncStatus, error?: string | null) => void;
  setLastSynced: (timestamp: number) => void;
  setConflict: (conflict: SyncConflict | null) => void;
  setItemStatus: (id: string, status: SyncItemStatus) => void;
  clearItemStatus: (id: string) => void;
  hydrateItemStatuses: (items: Record<string, SyncItemStatus>) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  offline: typeof navigator !== 'undefined' ? !navigator.onLine : false,
  queued: 0,
  processed: 0,
  status: 'idle',
  itemStatuses: {},
  lastSyncedAt: undefined,
  error: null,
  conflict: null,
  setOffline: (offline) => set({ offline }),
  setQueueState: (queued, processed = 0) => set({ queued, processed }),
  setStatus: (status, error = null) => set({ status, error }),
  setLastSynced: (timestamp) => set({ lastSyncedAt: timestamp }),
  setConflict: (conflict) => set({ conflict, status: conflict ? 'conflicted' : 'idle' }),
  setItemStatus: (id, status) =>
    set((current) => ({ itemStatuses: { ...current.itemStatuses, [id]: status } })),
  clearItemStatus: (id) =>
    set((current) => {
      const next = { ...current.itemStatuses };
      delete next[id];
      return { itemStatuses: next };
    }),
  hydrateItemStatuses: (items) => set({ itemStatuses: items }),
}));
