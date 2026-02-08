/*
 * SPDX-License-Identifier: MIT
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface GeneralSettings {
  companyName: string;
  timezone: string;
  dateFormat: string;
  language: string;
  emailDomain: string;
}

export interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  workOrderUpdates: boolean;
  maintenanceReminders: boolean;
  inventoryAlerts: boolean;
  systemUpdates: boolean;
  assignedWorkOrders: boolean;
  slaBreachAlerts: boolean;
  inventoryLowStock: boolean;
  preventiveMaintenanceDue: boolean;
  smsNotifications: boolean;
  smsNumber: string;
  webhookUrl?: string;
  slackWebhookUrl?: string;
  teamsWebhookUrl?: string;
}

export interface EmailSettings {
  dailyDigest: boolean;
  weeklyReport: boolean;
  criticalAlerts: boolean;
}

export interface ThemeSettings {
  sidebarCollapsed: boolean;
  denseMode: boolean;
  highContrast: boolean;
  rightPanelCollapsed: boolean;
  colorScheme: string | undefined;
  mode: 'light' | 'dark' | 'system' | undefined;
}

interface SettingsState {
  general: GeneralSettings;
  notifications: NotificationSettings;
  email: EmailSettings;
  theme: ThemeSettings;
  setGeneral: (settings: Partial<GeneralSettings>) => void;
  setNotifications: (settings: Partial<NotificationSettings>) => void;
  setEmail: (settings: Partial<EmailSettings>) => void;
  setTheme: (settings: Partial<ThemeSettings>) => void;
}

type SettingsSlices = Pick<SettingsState, 'general' | 'notifications' | 'email' | 'theme'>;

const toRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;

const createDefaultGeneral = (): GeneralSettings => ({
  companyName: 'Acme Industries',
  timezone: 'America/New_York',
  dateFormat: 'MM/DD/YYYY',
  language: 'en-US',
  emailDomain: 'cmms.com',
});

const createDefaultNotifications = (): NotificationSettings => ({
  emailNotifications: true,
  pushNotifications: true,
  workOrderUpdates: true,
  maintenanceReminders: true,
  inventoryAlerts: true,
  systemUpdates: false,
  assignedWorkOrders: true,
  slaBreachAlerts: true,
  inventoryLowStock: true,
  preventiveMaintenanceDue: true,
  smsNotifications: false,
  smsNumber: '',
  webhookUrl: '',
  slackWebhookUrl: '',
  teamsWebhookUrl: '',
});

const createDefaultEmail = (): EmailSettings => ({
  dailyDigest: true,
  weeklyReport: true,
  criticalAlerts: true,
});

const createDefaultTheme = (): ThemeSettings => ({
  mode: 'system',
  sidebarCollapsed: false,
  denseMode: false,
  highContrast: false,
  rightPanelCollapsed: false,
  colorScheme: 'default',
});

const sanitizeGeneralState = (value: unknown): GeneralSettings => {
  const defaults = createDefaultGeneral();
  const record = toRecord(value);
  if (!record) {
    return defaults;
  }

  const companyNameValue = record['companyName'];
  const timezoneValue = record['timezone'];
  const dateFormatValue = record['dateFormat'];
  const languageValue = record['language'];
  const emailDomainValue = record['emailDomain'];

  return {
    companyName: typeof companyNameValue === 'string' ? companyNameValue : defaults.companyName,
    timezone: typeof timezoneValue === 'string' ? timezoneValue : defaults.timezone,
    dateFormat: typeof dateFormatValue === 'string' ? dateFormatValue : defaults.dateFormat,
    language: typeof languageValue === 'string' ? languageValue : defaults.language,
    emailDomain: typeof emailDomainValue === 'string' ? emailDomainValue : defaults.emailDomain,
  };
};

const sanitizeNotificationsState = (value: unknown): NotificationSettings => {
  const defaults = createDefaultNotifications();
  const record = toRecord(value);
  if (!record) {
    return defaults;
  }

  return {
    emailNotifications:
      typeof record['emailNotifications'] === 'boolean'
        ? (record['emailNotifications'] as boolean)
        : defaults.emailNotifications,
    pushNotifications:
      typeof record['pushNotifications'] === 'boolean'
        ? (record['pushNotifications'] as boolean)
        : defaults.pushNotifications,
    workOrderUpdates:
      typeof record['workOrderUpdates'] === 'boolean'
        ? (record['workOrderUpdates'] as boolean)
        : defaults.workOrderUpdates,
    maintenanceReminders:
      typeof record['maintenanceReminders'] === 'boolean'
        ? (record['maintenanceReminders'] as boolean)
        : defaults.maintenanceReminders,
    inventoryAlerts:
      typeof record['inventoryAlerts'] === 'boolean'
        ? (record['inventoryAlerts'] as boolean)
        : defaults.inventoryAlerts,
    systemUpdates:
      typeof record['systemUpdates'] === 'boolean'
        ? (record['systemUpdates'] as boolean)
        : defaults.systemUpdates,
    assignedWorkOrders:
      typeof record['assignedWorkOrders'] === 'boolean'
        ? (record['assignedWorkOrders'] as boolean)
        : defaults.assignedWorkOrders,
    slaBreachAlerts:
      typeof record['slaBreachAlerts'] === 'boolean'
        ? (record['slaBreachAlerts'] as boolean)
        : defaults.slaBreachAlerts,
    inventoryLowStock:
      typeof record['inventoryLowStock'] === 'boolean'
        ? (record['inventoryLowStock'] as boolean)
        : defaults.inventoryLowStock,
    preventiveMaintenanceDue:
      typeof record['preventiveMaintenanceDue'] === 'boolean'
        ? (record['preventiveMaintenanceDue'] as boolean)
        : defaults.preventiveMaintenanceDue,
    smsNotifications:
      typeof record['smsNotifications'] === 'boolean'
        ? (record['smsNotifications'] as boolean)
        : defaults.smsNotifications,
    smsNumber: typeof record['smsNumber'] === 'string' ? (record['smsNumber'] as string) : defaults.smsNumber,
    webhookUrl: typeof record['webhookUrl'] === 'string' ? (record['webhookUrl'] as string) : defaults.webhookUrl,
    slackWebhookUrl:
      typeof record['slackWebhookUrl'] === 'string' ? (record['slackWebhookUrl'] as string) : defaults.slackWebhookUrl,
    teamsWebhookUrl:
      typeof record['teamsWebhookUrl'] === 'string' ? (record['teamsWebhookUrl'] as string) : defaults.teamsWebhookUrl,
  };
};

const sanitizeEmailState = (value: unknown): EmailSettings => {
  const defaults = createDefaultEmail();
  const record = toRecord(value);
  if (!record) {
    return defaults;
  }

  return {
    dailyDigest:
      typeof record['dailyDigest'] === 'boolean' ? (record['dailyDigest'] as boolean) : defaults.dailyDigest,
    weeklyReport:
      typeof record['weeklyReport'] === 'boolean' ? (record['weeklyReport'] as boolean) : defaults.weeklyReport,
    criticalAlerts:
      typeof record['criticalAlerts'] === 'boolean' ? (record['criticalAlerts'] as boolean) : defaults.criticalAlerts,
  };
};

const sanitizeThemeState = (value: unknown): ThemeSettings => {
  const defaults = createDefaultTheme();
  const record = toRecord(value);
  if (!record) {
    return defaults;
  }

  const modeValue = record['mode'];
  const colorSchemeValue = record['colorScheme'];

  return {
    sidebarCollapsed:
      typeof record['sidebarCollapsed'] === 'boolean'
        ? (record['sidebarCollapsed'] as boolean)
        : defaults.sidebarCollapsed,
    denseMode:
      typeof record['denseMode'] === 'boolean' ? (record['denseMode'] as boolean) : defaults.denseMode,
    highContrast:
      typeof record['highContrast'] === 'boolean'
        ? (record['highContrast'] as boolean)
        : defaults.highContrast,
    rightPanelCollapsed:
      typeof record['rightPanelCollapsed'] === 'boolean'
        ? (record['rightPanelCollapsed'] as boolean)
        : defaults.rightPanelCollapsed,
    colorScheme: typeof colorSchemeValue === 'string' ? (colorSchemeValue as string) : defaults.colorScheme,
    mode:
      modeValue === 'light' || modeValue === 'dark' || modeValue === 'system'
        ? (modeValue as ThemeSettings['mode'])
        : defaults.mode,
  };
};

const sanitizePersistedState = (persisted: unknown): SettingsSlices => {
  const record = toRecord(persisted);
  const inner = toRecord(record?.state ?? record);

  return {
    general: sanitizeGeneralState(inner?.['general']),
    notifications: sanitizeNotificationsState(inner?.['notifications']),
    email: sanitizeEmailState(inner?.['email']),
    theme: sanitizeThemeState(inner?.['theme']),
  };
};

const sanitizeGeneralUpdate = (value: Partial<GeneralSettings> | null | undefined): Partial<GeneralSettings> => {
  if (!value || typeof value !== 'object') {
    return {};
  }

  const updates: Partial<GeneralSettings> = {};

  if (typeof value.companyName === 'string') {
    updates.companyName = value.companyName;
  }
  if (typeof value.timezone === 'string') {
    updates.timezone = value.timezone;
  }
  if (typeof value.dateFormat === 'string') {
    updates.dateFormat = value.dateFormat;
  }
  if (typeof value.language === 'string') {
    updates.language = value.language;
  }
  if (typeof value.emailDomain === 'string') {
    updates.emailDomain = value.emailDomain;
  }

  return updates;
};

const sanitizeNotificationUpdate = (
  value: Partial<NotificationSettings> | null | undefined,
): Partial<NotificationSettings> => {
  if (!value || typeof value !== 'object') {
    return {};
  }

  const updates: Partial<NotificationSettings> = {};

  if (typeof value.emailNotifications === 'boolean') {
    updates.emailNotifications = value.emailNotifications;
  }
  if (typeof value.pushNotifications === 'boolean') {
    updates.pushNotifications = value.pushNotifications;
  }
  if (typeof value.workOrderUpdates === 'boolean') {
    updates.workOrderUpdates = value.workOrderUpdates;
  }
  if (typeof value.maintenanceReminders === 'boolean') {
    updates.maintenanceReminders = value.maintenanceReminders;
  }
  if (typeof value.inventoryAlerts === 'boolean') {
    updates.inventoryAlerts = value.inventoryAlerts;
  }
  if (typeof value.systemUpdates === 'boolean') {
    updates.systemUpdates = value.systemUpdates;
  }
  if (typeof value.assignedWorkOrders === 'boolean') {
    updates.assignedWorkOrders = value.assignedWorkOrders;
  }
  if (typeof value.slaBreachAlerts === 'boolean') {
    updates.slaBreachAlerts = value.slaBreachAlerts;
  }
  if (typeof value.inventoryLowStock === 'boolean') {
    updates.inventoryLowStock = value.inventoryLowStock;
  }
  if (typeof value.preventiveMaintenanceDue === 'boolean') {
    updates.preventiveMaintenanceDue = value.preventiveMaintenanceDue;
  }
  if (typeof value.smsNotifications === 'boolean') {
    updates.smsNotifications = value.smsNotifications;
  }
  if (typeof value.smsNumber === 'string') {
    updates.smsNumber = value.smsNumber;
  }
  if (typeof value.webhookUrl === 'string') {
    updates.webhookUrl = value.webhookUrl;
  }
  if (typeof value.slackWebhookUrl === 'string') {
    updates.slackWebhookUrl = value.slackWebhookUrl;
  }
  if (typeof value.teamsWebhookUrl === 'string') {
    updates.teamsWebhookUrl = value.teamsWebhookUrl;
  }

  return updates;
};

const sanitizeEmailUpdate = (value: Partial<EmailSettings> | null | undefined): Partial<EmailSettings> => {
  if (!value || typeof value !== 'object') {
    return {};
  }

  const updates: Partial<EmailSettings> = {};

  if (typeof value.dailyDigest === 'boolean') {
    updates.dailyDigest = value.dailyDigest;
  }
  if (typeof value.weeklyReport === 'boolean') {
    updates.weeklyReport = value.weeklyReport;
  }
  if (typeof value.criticalAlerts === 'boolean') {
    updates.criticalAlerts = value.criticalAlerts;
  }

  return updates;
};

const sanitizeThemeUpdate = (value: Partial<ThemeSettings> | null | undefined): Partial<ThemeSettings> => {
  if (!value || typeof value !== 'object') {
    return {};
  }

  const updates: Partial<ThemeSettings> = {};

  if (typeof value.sidebarCollapsed === 'boolean') {
    updates.sidebarCollapsed = value.sidebarCollapsed;
  }
  if (typeof value.denseMode === 'boolean') {
    updates.denseMode = value.denseMode;
  }
  if (typeof value.highContrast === 'boolean') {
    updates.highContrast = value.highContrast;
  }
  if (typeof value.rightPanelCollapsed === 'boolean') {
    updates.rightPanelCollapsed = value.rightPanelCollapsed;
  }
  if (typeof value.colorScheme === 'string') {
    updates.colorScheme = value.colorScheme;
  }
  if (value.mode === 'light' || value.mode === 'dark' || value.mode === 'system') {
    updates.mode = value.mode;
  }

  return updates;
};

const createDefaultSlices = (): SettingsSlices => ({
  general: createDefaultGeneral(),
  notifications: createDefaultNotifications(),
  email: createDefaultEmail(),
  theme: createDefaultTheme(),
});

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...createDefaultSlices(),
      setGeneral: (settings) =>
        set((state) => {
          const updates = sanitizeGeneralUpdate(settings);
          if (Object.keys(updates).length === 0) {
            return {};
          }
          return {
            general: { ...state.general, ...updates },
          };
        }),
      setNotifications: (settings) =>
        set((state) => {
          const updates = sanitizeNotificationUpdate(settings);
          if (Object.keys(updates).length === 0) {
            return {};
          }
          return {
            notifications: { ...state.notifications, ...updates },
          };
        }),
      setEmail: (settings) =>
        set((state) => {
          const updates = sanitizeEmailUpdate(settings);
          if (Object.keys(updates).length === 0) {
            return {};
          }
          return {
            email: { ...state.email, ...updates },
          };
        }),
      setTheme: (settings) =>
        set((state) => {
          const updates = sanitizeThemeUpdate(settings);
          if (Object.keys(updates).length === 0) {
            return {};
          }
          return {
            theme: { ...state.theme, ...updates },
          };
        }),
    }),
    {
      name: 'settings-storage',
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...sanitizePersistedState(persistedState),
      }),
    }
  )
);
