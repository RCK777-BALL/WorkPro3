/*
 * SPDX-License-Identifier: MIT
 */

import express from 'express';
import { Types } from 'mongoose';
import Settings from '../models/Settings';
import type { AuthedRequest } from '../types/http';

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

const resolveSettingsQuery = (req: AuthedRequest) => {
  const tenantId = req.tenantId;
  const userId = (req.user?._id ?? req.user?.id) as string | undefined;
  const query: Record<string, unknown> = {};
  if (tenantId) {
    query.tenantId = tenantId;
  }
  if (userId) {
    query.userId = userId;
  }
  return query;
};

router.get('/', async (req: AuthedRequest, res, next) => {
  try {
    const query = resolveSettingsQuery(req);
    let doc: Awaited<ReturnType<typeof Settings.findOne>> | null = null;
    if (Object.keys(query).length > 0) {
      doc = await Settings.findOne(query).lean();
    }
    res.json({
      ...settingsState,
      activePlant: doc?.activePlant ? doc.activePlant.toString() : null,
      defaultTheme: doc?.defaultTheme ?? settingsState.theme.mode,
      language: doc?.language ?? settingsState.general.language,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req: AuthedRequest, res, next) => {
  try {
    const payload = (req.body ?? {}) as Partial<SettingsState> & {
      activePlant?: string | null;
      defaultTheme?: string;
      language?: string;
    };

    settingsState = {
      general: { ...settingsState.general, ...(payload.general ?? {}) },
      notifications: { ...settingsState.notifications, ...(payload.notifications ?? {}) },
      email: { ...settingsState.email, ...(payload.email ?? {}) },
      theme: { ...settingsState.theme, ...(payload.theme ?? {}) },
    };

    const query = resolveSettingsQuery(req);
    let updatedDoc: Awaited<ReturnType<typeof Settings.findOneAndUpdate>> | null = null;
    if (Object.keys(query).length > 0) {
      const update: Record<string, unknown> = {};
      const activePlant = payload.activePlant;
      if (activePlant && Types.ObjectId.isValid(activePlant)) {
        update.activePlant = new Types.ObjectId(activePlant);
      }
      if (payload.defaultTheme || payload.theme?.mode) {
        update.defaultTheme = payload.defaultTheme ?? payload.theme?.mode ?? 'dark';
      }
      if (payload.language || payload.general?.language) {
        update.language = payload.language ?? payload.general?.language ?? 'en';
      }
      if (Object.keys(update).length > 0) {
        updatedDoc = await Settings.findOneAndUpdate(query, update, {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
        });
      }
    }

    res.json({
      message: 'Settings updated',
      data: {
        ...settingsState,
        activePlant: updatedDoc?.activePlant
          ? updatedDoc.activePlant.toString()
          : payload.activePlant ?? null,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
