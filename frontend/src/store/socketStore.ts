/*
 * SPDX-License-Identifier: MIT
 */

import { create } from 'zustand';

export interface SocketState {
  connected: boolean;
  setConnected: (connected: boolean) => void;
}

export const useSocketStore = create<SocketState>((set) => ({
  connected: false,
  setConnected: (connected: boolean) => set({ connected }),
}));

