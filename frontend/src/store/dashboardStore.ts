/*
 * SPDX-License-Identifier: MIT
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Layouts } from 'react-grid-layout';

export type Timeframe = '7d' | '30d' | '90d' | 'ytd' | 'custom';

export interface DateRange {
  start: string;
  end: string;
}

interface DashboardState {
  selectedTimeframe: Timeframe;
  selectedDepartment: string;
  selectedRole: string;
  role: string;
  customRange: DateRange;
  selectedKPIs: string[];
  layouts: Layouts;
  setSelectedTimeframe: (t: Timeframe) => void;
  setSelectedDepartment: (d: string) => void;
  setSelectedRole: (r: string) => void;
  setRole: (r: string) => void;
  setCustomRange: (range: DateRange) => void;
  setSelectedKPIs: (kpis: string[]) => void;
  setLayouts: (layouts: Layouts) => void;
  addKPI: (id: string) => void;
  removeKPI: (id: string) => void;
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      selectedTimeframe: '7d',
      selectedDepartment: 'all',
      selectedRole: 'all',
      role: '',
      customRange: {
        start: new Date().toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0],
      },
      selectedKPIs: [],
      layouts: {},
      setSelectedTimeframe: (selectedTimeframe) => set({ selectedTimeframe }),
      setSelectedDepartment: (selectedDepartment) => set({ selectedDepartment }),
      setSelectedRole: (selectedRole) => set({ selectedRole }),
      setRole: (role) => set({ role }),
      setCustomRange: (customRange) => set({ customRange }),
      setSelectedKPIs: (selectedKPIs) => set({ selectedKPIs }),
      setLayouts: (layouts) => {
        set({ layouts });
      },
      addKPI: (id) =>
        set((state) => ({
          selectedKPIs: state.selectedKPIs.includes(id)
            ? state.selectedKPIs
            : [...state.selectedKPIs, id],
        })),
      removeKPI: (id) =>
        set((state) => ({
          selectedKPIs: state.selectedKPIs.filter((kpi) => kpi !== id),
        })),
    }),
    {
      name: 'dashboard-layouts',
    }
  )
);
