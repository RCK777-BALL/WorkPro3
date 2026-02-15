/*
 * SPDX-License-Identifier: MIT
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type DashboardWidgetId =
  | 'open'
  | 'overdue'
  | 'pmDue'
  | 'compliance'
  | 'mttr'
  | 'asset'
  | 'permits'
  | 'livePulse';

type DashboardPreset = 'default' | 'technician' | 'manager';

const DEFAULT_ORDER: DashboardWidgetId[] = [
  'open',
  'overdue',
  'pmDue',
  'compliance',
  'mttr',
  'asset',
  'permits',
  'livePulse',
];

const PRESET_ORDER: Record<DashboardPreset, DashboardWidgetId[]> = {
  default: DEFAULT_ORDER,
  technician: ['open', 'overdue', 'pmDue', 'asset', 'livePulse', 'compliance', 'mttr', 'permits'],
  manager: ['compliance', 'asset', 'mttr', 'open', 'overdue', 'pmDue', 'permits', 'livePulse'],
};

interface DashboardLayoutState {
  widgetOrder: DashboardWidgetId[];
  hiddenWidgets: DashboardWidgetId[];
  preset: DashboardPreset;
  hasCustomLayout: boolean;
  setWidgetOrder: (order: DashboardWidgetId[]) => void;
  toggleWidget: (id: DashboardWidgetId) => void;
  moveWidget: (id: DashboardWidgetId, direction: 'up' | 'down') => void;
  applyPreset: (preset: DashboardPreset) => void;
}

const unique = (items: DashboardWidgetId[]) => Array.from(new Set(items));

export const useDashboardLayoutStore = create<DashboardLayoutState>()(
  persist(
    (set, get) => ({
      widgetOrder: DEFAULT_ORDER,
      hiddenWidgets: [],
      preset: 'default',
      hasCustomLayout: false,
      setWidgetOrder: (order) =>
        set({
          widgetOrder: unique(order),
          hasCustomLayout: true,
        }),
      toggleWidget: (id) =>
        set((state) => {
          const isHidden = state.hiddenWidgets.includes(id);
          return {
            hiddenWidgets: isHidden
              ? state.hiddenWidgets.filter((widget) => widget !== id)
              : [...state.hiddenWidgets, id],
            hasCustomLayout: true,
          };
        }),
      moveWidget: (id, direction) =>
        set((state) => {
          const order = [...state.widgetOrder];
          const index = order.indexOf(id);
          if (index === -1) return {};
          const nextIndex = direction === 'up' ? index - 1 : index + 1;
          if (nextIndex < 0 || nextIndex >= order.length) return {};
          const [moved] = order.splice(index, 1);
          order.splice(nextIndex, 0, moved);
          return { widgetOrder: order, hasCustomLayout: true };
        }),
      applyPreset: (preset) => {
        const order = PRESET_ORDER[preset] ?? DEFAULT_ORDER;
        set({
          widgetOrder: unique(order),
          hiddenWidgets: [],
          preset,
          hasCustomLayout: false,
        });
      },
    }),
    {
      name: 'dashboard-layout-storage',
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...(persistedState as Partial<DashboardLayoutState>),
      }),
    },
  ),
);
