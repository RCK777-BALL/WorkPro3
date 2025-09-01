import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
  colorScheme?: string;
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

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
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
      },
      setGeneral: (settings) =>
        set((state) => ({
          general: { ...state.general, ...settings },
        })),
      setNotifications: (settings) =>
        set((state) => ({
          notifications: { ...state.notifications, ...settings },
        })),
      setEmail: (settings) =>
        set((state) => ({
          email: { ...state.email, ...settings },
        })),
      setTheme: (settings) =>
        set((state) => ({
          theme: { ...state.theme, ...settings },
        })),
    }),
    {
      name: 'settings-storage',
    }
  )
);
