/*
 * SPDX-License-Identifier: MIT
 */

import { create } from 'zustand';

export type RealtimeMode = 'streaming' | 'polling';

interface RealtimeStatusState {
  mode: RealtimeMode;
  lastDelivery?: number;
  retryInMs?: number | null;
  banner?: string | null;
  setStreaming: () => void;
  setPolling: (banner: string, retryInMs?: number | null) => void;
  markDelivery: () => void;
}

export const useRealtimeStatusStore = create<RealtimeStatusState>((set) => ({
  mode: 'streaming',
  lastDelivery: undefined,
  retryInMs: null,
  banner: null,
  setStreaming: () =>
    set(() => ({
      mode: 'streaming',
      banner: null,
      retryInMs: null,
    })),
  setPolling: (banner: string, retryInMs: number | null = null) =>
    set(() => ({
      mode: 'polling',
      banner,
      retryInMs,
    })),
  markDelivery: () => set(() => ({ lastDelivery: Date.now() })),
}));
