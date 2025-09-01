import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface DataState {
  useFakeData: boolean;
  setUseFakeData: (useFakeData: boolean) => void;
}

export const useDataStore = create<DataState>()(
  persist(
    (set) => ({
      useFakeData: true,
      setUseFakeData: (useFakeData) => set({ useFakeData }),
    }),
    {
      name: 'data-mode-storage',
    }
  )
);
