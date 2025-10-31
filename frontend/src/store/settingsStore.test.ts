/*
 * SPDX-License-Identifier: MIT
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const STORAGE_KEY = 'settings-storage';

const importStore = async () => {
  const module = await import('@/store/settingsStore');
  await module.useSettingsStore.persist.rehydrate();
  return module.useSettingsStore;
};

const DEFAULT_GENERAL = {
  companyName: 'Acme Industries',
  timezone: 'America/New_York',
  dateFormat: 'MM/DD/YYYY',
  language: 'en-US',
  emailDomain: 'cmms.com',
};

const DEFAULT_NOTIFICATIONS = {
  emailNotifications: true,
  pushNotifications: true,
  workOrderUpdates: true,
  maintenanceReminders: true,
  inventoryAlerts: true,
  systemUpdates: false,
};

const DEFAULT_EMAIL = {
  dailyDigest: true,
  weeklyReport: true,
  criticalAlerts: true,
};

const DEFAULT_THEME = {
  mode: 'system' as const,
  sidebarCollapsed: false,
  denseMode: false,
  highContrast: false,
  colorScheme: 'default',
};

describe('settingsStore persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it('restores defaults when persisted slices are missing or invalid', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        state: { general: null, notifications: null, email: null, theme: null },
      }),
    );

    const store = await importStore();
    const state = store.getState();

    expect(state.general).toEqual(DEFAULT_GENERAL);
    expect(state.notifications).toEqual(DEFAULT_NOTIFICATIONS);
    expect(state.email).toEqual(DEFAULT_EMAIL);
    expect(state.theme).toEqual(DEFAULT_THEME);
  });

  it('merges persisted partial state with defaults', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        state: {
          general: { companyName: 'Persisted Co' },
          notifications: { systemUpdates: true },
        },
      }),
    );

    const store = await importStore();
    const state = store.getState();

    expect(state.general).toEqual({
      ...DEFAULT_GENERAL,
      companyName: 'Persisted Co',
    });
    expect(state.notifications).toEqual({
      ...DEFAULT_NOTIFICATIONS,
      systemUpdates: true,
    });
    expect(state.email).toEqual(DEFAULT_EMAIL);
    expect(state.theme).toEqual(DEFAULT_THEME);
  });

  it('ignores invalid updates when mutating slices', async () => {
    const store = await importStore();
    const initialState = store.getState();

    initialState.setGeneral({ companyName: 'New Name' });
    expect(store.getState().general.companyName).toBe('New Name');
    initialState.setGeneral({ companyName: 123 as unknown as string });
    expect(store.getState().general.companyName).toBe('New Name');

    initialState.setNotifications({ emailNotifications: false });
    expect(store.getState().notifications.emailNotifications).toBe(false);
    initialState.setNotifications({ emailNotifications: 'nope' as unknown as boolean });
    expect(store.getState().notifications.emailNotifications).toBe(false);

    initialState.setEmail({ weeklyReport: false });
    expect(store.getState().email.weeklyReport).toBe(false);
    initialState.setEmail({ weeklyReport: 'later' as unknown as boolean });
    expect(store.getState().email.weeklyReport).toBe(false);

    initialState.setTheme({ mode: 'light' });
    expect(store.getState().theme.mode).toBe('light');
    initialState.setTheme({ mode: 'solar' as any });
    expect(store.getState().theme.mode).toBe('light');
    initialState.setTheme({ colorScheme: 'teal' });
    expect(store.getState().theme.colorScheme).toBe('teal');
    initialState.setTheme({ colorScheme: 123 as unknown as string });
    expect(store.getState().theme.colorScheme).toBe('teal');
  });
});
