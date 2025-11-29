/*
 * SPDX-License-Identifier: MIT
 */

import { create } from 'zustand';
import type { SyncConflict } from '@/utils/offlineQueue';

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'conflicted';

interface SyncState {
  offline: boolean;
  queued: number;
  processed: number;
  status: SyncStatus;
  lastSyncedAt?: number;
  error?: string | null;
  conflict?: SyncConflict | null;
  setOffline: (offline: boolean) => void;
  setQueueState: (queued: number, processed?: number) => void;
  setStatus: (status: SyncStatus, error?: string | null) => void;
  setLastSynced: (timestamp: number) => void;
  setConflict: (conflict: SyncConflict | null) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  offline: typeof navigator !== 'undefined' ? !navigator.onLine : false,
  queued: 0,
  processed: 0,
  status: 'idle',
  lastSyncedAt: undefined,
  error: null,
  conflict: null,
  setOffline: (offline) => set({ offline }),
  setQueueState: (queued, processed = 0) => set({ queued, processed }),
  setStatus: (status, error = null) => set({ status, error }),
  setLastSynced: (timestamp) => set({ lastSyncedAt: timestamp }),
  setConflict: (conflict) => set({ conflict, status: conflict ? 'conflicted' : 'idle' }),
}));
