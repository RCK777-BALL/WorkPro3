import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Layouts } from 'react-grid-layout';

export type Timeframe = 'day' | 'week' | 'month';

interface DateRange {
  start: string;
  end: string;
}

interface DashboardState {
  selectedTimeframe: Timeframe;
  selectedDepartment: string;
  selectedRole: string;
  role: string;
  dateRange: DateRange;
  selectedKPIs: string[];
  layouts: Layouts;
  setSelectedTimeframe: (t: Timeframe) => void;
  setSelectedDepartment: (d: string) => void;
  setSelectedRole: (r: string) => void;
  setRole: (r: string) => void;
  setDateRange: (range: DateRange) => void;
  setSelectedKPIs: (kpis: string[]) => void;
  setLayouts: (layouts: Layouts) => void;
  addKPI: (id: string) => void;
  removeKPI: (id: string) => void;
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      selectedTimeframe: 'day',
      selectedDepartment: 'all',
      selectedRole: 'all',
      role: '',
      dateRange: {
        start: new Date().toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0],
      },
      selectedKPIs: [],
      layouts: {},
      setSelectedTimeframe: (selectedTimeframe) => set({ selectedTimeframe }),
      setSelectedDepartment: (selectedDepartment) => set({ selectedDepartment }),
      setSelectedRole: (selectedRole) => set({ selectedRole }),
      setRole: (role) => set({ role }),
      setDateRange: (dateRange) => set({ dateRange }),
      setSelectedKPIs: (selectedKPIs) => set({ selectedKPIs }),
      setLayouts: (layouts) => {
        set({ layouts });
        try {
          if (typeof window !== 'undefined') {
            localStorage.setItem('dashboardLayoutV1', JSON.stringify(layouts));
          }
        } catch {
          /* ignore */
        }
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
      name: 'dashboard-storage',
    }
  )
);
