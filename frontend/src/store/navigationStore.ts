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
  | 'downtime'
  | 'downtime-events'
  | 'work-orders'
  | 'work-requests'
  | 'work-request-portal'
  | 'parts'
  | 'inventory-locations'
  | 'reorder-alerts'
  | 'permits'
  | 'pm-templates'
  | 'maintenance'
  | 'inventory'
  | 'inventory-analytics'
  | 'analytics'
  | 'analytics-maintenance'
  | 'pm-analytics'
  | 'iot-monitoring'
  | 'analytics-global'
  | 'analytics-ai'
  | 'executive'
  | 'purchase-orders'
  | 'vendors'
  | 'messages'
  | 'help-center'
  | 'documentation-getting-started'
  | 'documentation-asset-management'
  | 'notification-settings'
  | 'settings'
  | 'imports'
  | 'audit';

const defaultOrder: NavItemId[] = [
  'dashboard',
  'work-orders',
  'work-requests',
  'work-request-portal',
  'departments',
  'lines',
  'stations',
  'assets',
  'asset-scan',
  'teams',
  'reports',
  'downtime',
  'downtime-events',
  'inventory',
  'reorder-alerts',
  'permits',
  'pm-templates',
  'maintenance',
  'inventory-analytics',
  'analytics',
  'analytics-maintenance',
  'pm-analytics',
  'iot-monitoring',
  'analytics-global',
  'analytics-ai',
  'executive',
  'purchase-orders',
  'vendors',
  'messages',
  'help-center',
  'documentation-getting-started',
  'documentation-asset-management',
  'notification-settings',
  'settings',
  'audit',
  'imports',
];

interface NavigationState {
  sidebarOrder: NavItemId[];
  pinnedItems: NavItemId[];
  recentItems: NavItemId[];
  setSidebarOrder: (order: NavItemId[]) => void;
  moveSidebarItem: (active: NavItemId, over: NavItemId) => void;
  pinItem: (id: NavItemId) => void;
  unpinItem: (id: NavItemId) => void;
  addRecentItem: (id: NavItemId) => void;
}

export const useNavigationStore = create<NavigationState>()(
  persist(
    (set) => ({
      sidebarOrder: defaultOrder,
      pinnedItems: [],
      recentItems: [],
      setSidebarOrder: (order) => set({ sidebarOrder: order }),
      moveSidebarItem: (active, over) =>
        set((state) => {
          const oldIndex = state.sidebarOrder.indexOf(active);
          const newIndex = state.sidebarOrder.indexOf(over);
          if (oldIndex === -1 || newIndex === -1) return {};
          return { sidebarOrder: arrayMove(state.sidebarOrder, oldIndex, newIndex) };
        }),
      pinItem: (id) =>
        set((state) => {
          if (state.pinnedItems.includes(id)) return {};
          return { pinnedItems: [...state.pinnedItems, id] };
        }),
      unpinItem: (id) =>
        set((state) => ({
          pinnedItems: state.pinnedItems.filter((item) => item !== id),
        })),
      addRecentItem: (id) =>
        set((state) => {
          const next = [id, ...state.recentItems.filter((item) => item !== id)];
          return { recentItems: next.slice(0, 6) };
        }),
    }),
    {
      name: 'navigation-storage',
    }
  )
);

export { defaultOrder };
