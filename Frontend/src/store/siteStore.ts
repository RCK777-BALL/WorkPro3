import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SiteState {
  siteId: string | null;
  setSiteId: (id: string | null) => void;
}

export const useSiteStore = create<SiteState>()(
  persist(
    (set) => ({
      siteId: null,
      setSiteId: (id) => set({ siteId: id }),
    }),
    { name: 'site-storage' }
  )
);
