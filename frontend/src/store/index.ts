/*
 * SPDX-License-Identifier: MIT
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { User, WorkOrder, Asset, Channel, Message } from '@/types';

interface AppState {
  user: User | null;
  workOrders: WorkOrder[];
  assets: Asset[];
  channels: Channel[];
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  setUser: (user: User | null) => void;
  setWorkOrders: (workOrders: WorkOrder[]) => void;
  setAssets: (assets: Asset[]) => void;
  setChannels: (channels: Channel[]) => void;
  setMessages: (messages: Message[]) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useStore = create<AppState>()(
  devtools(
    persist(
      (set) => ({
        user: null,
        workOrders: [],
        assets: [],
        channels: [],
        messages: [],
        isLoading: false,
        error: null,
        setUser: (user) => set({ user }),
        setWorkOrders: (workOrders) => set({ workOrders }),
        setAssets: (assets) => set({ assets }),
        setChannels: (channels) => set({ channels }),
        setMessages: (messages) => set({ messages }),
        setLoading: (isLoading) => set({ isLoading }),
        setError: (error) => set({ error }),
      }),
      {
        name: 'app-storage',
      }
    )
  )
);
