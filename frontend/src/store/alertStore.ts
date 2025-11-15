/*
 * SPDX-License-Identifier: MIT
 */

import { create } from 'zustand';

export type AlertLevel = 'info' | 'warning' | 'critical' | 'success';

export interface Alert {
  _id: string;
  plant: string;
  type: 'downtime' | 'wrenchTime' | 'pmCompliance' | 'iot';
  level: AlertLevel;
  message: string;
  resolved?: boolean;
  timestamp?: string;
  createdAt?: string;
  asset?: string;
  assetName?: string;
  metric?: string;
}

interface AlertState {
  alerts: Alert[];
  initialized: boolean;
  setAlerts: (alerts: Alert[]) => void;
  addAlert: (alert: Alert) => void;
  setInitialized: () => void;
}

export const useAlertStore = create<AlertState>((set) => ({
  alerts: [],
  initialized: false,
  setAlerts: (alerts) => set({ alerts }),
  addAlert: (alert) =>
    set((state) => ({ alerts: [alert, ...state.alerts].slice(0, 50) })),
  setInitialized: () => set({ initialized: true }),
}));
