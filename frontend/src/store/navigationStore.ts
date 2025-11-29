/*
 * SPDX-License-Identifier: MIT
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { arrayMove } from '@dnd-kit/sortable';

export type NavItemId =
  | 'dashboard'
  | 'departments'
  | 'lines'
  | 'stations'
  | 'assets'
  | 'asset-scan'
  | 'teams'
  | 'reports'
  | 'work-orders'
  | 'work-requests'
  | 'permits'
  | 'pm-templates'
  | 'maintenance'
  | 'inventory'
  | 'analytics'
  | 'pm-analytics'
  | 'iot-monitoring'
  | 'analytics-global'
  | 'analytics-ai'
  | 'executive'
  | 'vendors'
  | 'messages'
  | 'documentation-getting-started'
  | 'documentation-asset-management'
  | 'notification-settings'
  | 'settings'
  | 'imports'
  | 'audit';

const defaultOrder: NavItemId[] = [
  'dashboard',
  'departments',
  'lines',
  'stations',
  'assets',
  'asset-scan',
  'teams',
  'reports',
  'work-orders',
  'work-requests',
  'permits',
  'pm-templates',
  'maintenance',
  'inventory',
  'analytics',
  'pm-analytics',
  'iot-monitoring',
  'analytics-global',
  'analytics-ai',
  'executive',
  'vendors',
  'messages',
  'documentation-getting-started',
  'documentation-asset-management',
  'notification-settings',
  'settings',
  'audit',
  'imports',
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
