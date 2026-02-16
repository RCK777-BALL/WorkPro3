/*
 * SPDX-License-Identifier: MIT
 */

import express from 'express';
import { Types } from 'mongoose';

import { requireAuth } from '../middleware/authMiddleware';
import Settings from '../models/Settings';
import { auditAction } from '../utils/audit';
import User from '../models/User';
import { requirePermission } from '../src/auth/permissions';

interface GeneralSettings {
  companyName: string;
  timezone: string;
  dateFormat: string;
  language: string;
  unitSystem: 'metric' | 'imperial';
  locale: string;
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
    unitSystem: 'metric',
    locale: 'en-US',
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

router.get('/', requirePermission('sites.read'), async (req, res, next) => {
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
        timezone: doc?.timezone ?? settingsState.general.timezone,
        locale: doc?.locale ?? settingsState.general.locale,
        unitSystem: (doc?.unitSystem as GeneralSettings['unitSystem']) ?? settingsState.general.unitSystem,
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

router.post('/', requirePermission('sites.manage'), async (req, res, next) => {
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

    const timezone = payload.general?.timezone ?? settingsState.general.timezone;
    if (timezone) {
      update.timezone = timezone;
    }

    const locale = payload.general?.locale ?? settingsState.general.locale;
    if (locale) {
      update.locale = locale;
    }

    const unitSystem = payload.general?.unitSystem ?? settingsState.general.unitSystem;
    if (unitSystem) {
      update.unitSystem = unitSystem;
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
      returnDocument: 'after',
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

router.post('/notifications/preferences', requirePermission('sites.manage'), async (req, res, next) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }
    const { notifyByEmail, notifyBySms } = req.body ?? {};
    const updated = await User.findByIdAndUpdate(
      userId,
      { $set: { notifyByEmail, notifyBySms } },
      { returnDocument: 'after' },
    ).select('notifyByEmail notifyBySms');
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

export default router;
