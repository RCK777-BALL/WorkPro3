/*
 * SPDX-License-Identifier: MIT
 */

import express from 'express';

interface GeneralSettings {
  companyName: string;
  timezone: string;
  dateFormat: string;
  language: string;
}

interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  workOrderUpdates: boolean;
  maintenanceReminders: boolean;
  inventoryAlerts: boolean;
  systemUpdates: boolean;
}

interface EmailSettings {
  dailyDigest: boolean;
  weeklyReport: boolean;
  criticalAlerts: boolean;
}

interface ThemeSettings {
  sidebarCollapsed: boolean;
  denseMode: boolean;
  highContrast: boolean;
  colorScheme: string;
  mode: 'light' | 'dark' | 'system';
}

interface SettingsState {
  general: GeneralSettings;
  notifications: NotificationSettings;
  email: EmailSettings;
  theme: ThemeSettings;
}

const defaultSettings: SettingsState = {
  general: {
    companyName: 'Acme Industries',
    timezone: 'America/New_York',
    dateFormat: 'MM/DD/YYYY',
    language: 'en-US',
  },
  notifications: {
    emailNotifications: true,
    pushNotifications: true,
    workOrderUpdates: true,
    maintenanceReminders: true,
    inventoryAlerts: true,
    systemUpdates: false,
  },
  email: {
    dailyDigest: true,
    weeklyReport: true,
    criticalAlerts: true,
  },
  theme: {
    sidebarCollapsed: false,
    denseMode: false,
    highContrast: false,
    colorScheme: 'default',
    mode: 'system',
  },
};

let settingsState: SettingsState = {
  general: { ...defaultSettings.general },
  notifications: { ...defaultSettings.notifications },
  email: { ...defaultSettings.email },
  theme: { ...defaultSettings.theme },
};

const router = express.Router();

router.get('/', (_req, res) => {
  res.json(settingsState);
});

router.post('/', (req, res) => {
  const payload = (req.body ?? {}) as Partial<SettingsState>;

  settingsState = {
    general: { ...settingsState.general, ...(payload.general ?? {}) },
    notifications: { ...settingsState.notifications, ...(payload.notifications ?? {}) },
    email: { ...settingsState.email, ...(payload.email ?? {}) },
    theme: { ...settingsState.theme, ...(payload.theme ?? {}) },
  };

  res.json({
    message: 'Settings updated',
    data: settingsState,
  });
});

export default router;
