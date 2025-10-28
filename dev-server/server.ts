import express from 'express';
import cors, { type CorsOptions } from 'cors';
import dotenv from 'dotenv';
import logger from './logger';
import { connectDB } from '../backend/config/db';

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

// Load environment variables
dotenv.config();

const app = express();

// This lightweight server is intended for local development only.
// Its CORS configuration mirrors the main backend so the frontend behaves the same.
const allowedOrigin = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim());

const corsOptions: CorsOptions = {
  origin: (origin, cb) => {
    if (!origin || allowedOrigin.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

app.get('/api/settings', (_req, res) => {
  res.json({ data: settingsState });
});

app.post('/api/settings', (req, res) => {
  const payload = (req.body ?? {}) as Partial<SettingsState>;

  settingsState = {
    general: { ...settingsState.general, ...(payload.general ?? {}) },
    notifications: { ...settingsState.notifications, ...(payload.notifications ?? {}) },
    email: { ...settingsState.email, ...(payload.email ?? {}) },
    theme: { ...settingsState.theme, ...(payload.theme ?? {}) },
  };

  res.json({ message: 'Settings updated', data: settingsState });
});

// 404 handler
app.use('*', (_req, res) => {
  res.status(404).json({ message: 'Not Found' });
});

// Start server
const PORT = process.env.PORT || 5010;

const startServer = async () => {
  try {
    await connectDB();
    logger.info('MongoDB connected');
  } catch (err) {
    logger.error('MongoDB connection error:', err);
    process.exit(1);
  }

  try {
    const server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
    server.on('error', (err) => {
      logger.error('Server failed to start:', err);
    });
  } catch (err) {
    logger.error('Server startup error:', err);
    process.exit(1);
  }
};

void startServer();
