import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { arrayMove } from '@dnd-kit/sortable';

export type NavItemId =
  | 'dashboard'
  | 'assets'
  | 'work-orders'
  | 'maintenance'
  | 'pm-tasks'
  | 'inventory'
  | 'vendors'
  | 'messages'
  | 'departments'
  | 'analytics'
  | 'teams'
  | 'settings'
  | 'documentation'
  | 'timesheets';

const defaultOrder: NavItemId[] = [
  'dashboard',
  'assets',
  'work-orders',
  'maintenance',
  'pm-tasks',
  'inventory',
  'vendors',
  'messages',
  'departments',
  'analytics',
  'teams',
  'settings',
  'documentation',
  'timesheets',
];

interface NavigationState {
  sidebarOrder: NavItemId[];
  setSidebarOrder: (order: NavItemId[]) => void;
  moveSidebarItem: (active: NavItemId, over: NavItemId) => void;
}

export const useNavigationStore = create<NavigationState>()(
  persist(
    (set) => ({
      sidebarOrder: defaultOrder,
      setSidebarOrder: (order) => set({ sidebarOrder: order }),
      moveSidebarItem: (active, over) =>
        set((state) => {
          const oldIndex = state.sidebarOrder.indexOf(active);
          const newIndex = state.sidebarOrder.indexOf(over);
          if (oldIndex === -1 || newIndex === -1) return {};
          return { sidebarOrder: arrayMove(state.sidebarOrder, oldIndex, newIndex) };
        }),
    }),
    {
      name: 'navigation-storage',
    }
  )
);

export { defaultOrder };
