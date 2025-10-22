/*
 * SPDX-License-Identifier: MIT
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import http from '@/lib/http';
interface ThemeState {
  theme: 'light' | 'dark' | 'system';
  
  colorScheme: string;
  fetchTheme: () => Promise<void>;
  updateTheme: (data: Partial<{ theme: 'light' | 'dark' | 'system'; colorScheme: string }>) => Promise<void>;
  setTheme: (theme: 'light' | 'dark' | 'system') => Promise<void>;
  
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'system',
 
      colorScheme: 'default',
      setTheme: async (theme) => {
        await get().updateTheme({ theme });
      },
      fetchTheme: async () => {
        try {
          const res = await http.get('/theme');
          set({ theme: res.data.theme, colorScheme: res.data.colorScheme });
        } catch (err) {
          console.error(err);
        }
      },
      updateTheme: async (data) => {
        type ThemeFields = Partial<Omit<ThemeState, 'fetchTheme' | 'updateTheme' | 'setTheme'>>;
        set(data as ThemeFields);
        try {
          await http.put('/theme', { ...get(), ...data });
        } catch (err) {
          console.error(err);
 
        }
      },
    }),
    {
      name: 'theme-storage',
    }
  )
);
