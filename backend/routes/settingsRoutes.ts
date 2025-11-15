/*
 * SPDX-License-Identifier: MIT
 */

import express from 'express';
import { Types } from 'mongoose';

import { requireAuth } from '../middleware/authMiddleware';
import Settings from '../models/Settings';
import { auditAction } from '../utils/audit';

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

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const query = req.tenantId ? { tenantId: req.tenantId } : {};
    const doc = await Settings.findOne(query).lean();
    const activePlant = doc?.activePlant ? (doc.activePlant as Types.ObjectId).toString() : undefined;
    const resolvedTheme =
      doc?.defaultTheme === 'light'
        ? 'light'
        : doc?.defaultTheme === 'dark'
          ? 'dark'
          : settingsState.theme.mode;

    const response = {
      ...settingsState,
      general: {
        ...settingsState.general,
        language: doc?.language ?? settingsState.general.language,
      },
      theme: {
        ...settingsState.theme,
        mode: resolvedTheme,
      },
      activePlant,
    };

    res.json(response);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const previousState = JSON.parse(JSON.stringify(settingsState));
    const payload = (req.body ?? {}) as Partial<SettingsState & { activePlant?: string }>;

    settingsState = {
      general: { ...settingsState.general, ...(payload.general ?? {}) },
      notifications: { ...settingsState.notifications, ...(payload.notifications ?? {}) },
      email: { ...settingsState.email, ...(payload.email ?? {}) },
      theme: { ...settingsState.theme, ...(payload.theme ?? {}) },
    };

    const query = req.tenantId ? { tenantId: req.tenantId } : {};
    const update: Record<string, unknown> = {};

    const language = payload.general?.language ?? settingsState.general.language;
    if (language) {
      update.language = language;
    }

    const themeMode = payload.theme?.mode ?? settingsState.theme.mode;
    if (themeMode) {
      update.defaultTheme = themeMode;
    }

    const plantId = payload.activePlant;
    if (plantId && Types.ObjectId.isValid(plantId)) {
      update.activePlant = new Types.ObjectId(plantId);
    }

    if (req.tenantId) {
      update.tenantId = req.tenantId;
    }

    const settings = await Settings.findOneAndUpdate(query, update, {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    });

    await auditAction(req, 'update', 'Settings', req.tenantId ?? 'global', previousState, settingsState);

    res.json({
      message: 'Settings updated',
      data: {
        ...settingsState,
        activePlant: settings?.activePlant ? settings.activePlant.toString() : plantId,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
