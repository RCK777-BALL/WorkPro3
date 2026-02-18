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
  | 'calibration'
  | 'automation-cbm'
  | 'planning-dispatch'
  | 'maintenance'
  | 'inventory'
  | 'inventory-analytics'
  | 'analytics'
  | 'analytics-maintenance'
  | 'pm-analytics'
  | 'iot-monitoring'
  | 'analytics-global'
  | 'analytics-reliability'
  | 'analytics-ai'
  | 'executive'
  | 'integrations-catalog'
  | 'integrations-observability'
  | 'purchase-orders'
  | 'vendors'
  | 'messages'
  | 'documentation-getting-started'
  | 'documentation-asset-management'
  | 'notification-settings'
  | 'settings'
  | 'mobile-program'
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
  'downtime',
  'downtime-events',
  'work-orders',
  'work-requests',
  'work-request-portal',
  'parts',
  'inventory-locations',
  'reorder-alerts',
  'permits',
  'pm-templates',
  'calibration',
  'automation-cbm',
  'planning-dispatch',
  'maintenance',
  'inventory',
  'inventory-analytics',
  'analytics',
  'analytics-maintenance',
  'pm-analytics',
  'iot-monitoring',
  'analytics-global',
  'analytics-reliability',
  'analytics-ai',
  'executive',
  'integrations-catalog',
  'integrations-observability',
  'purchase-orders',
  'vendors',
  'messages',
  'documentation-getting-started',
  'documentation-asset-management',
  'notification-settings',
  'mobile-program',
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
