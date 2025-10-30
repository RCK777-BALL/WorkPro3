import express from 'express';
import cors, { type CorsOptions } from 'cors';
import dotenv from 'dotenv';
import { randomUUID } from 'node:crypto';
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

interface InventoryPart {
  id: string;
  name: string;
  description?: string;
  category?: string;
  sku: string;
  location?: string;
  quantity: number;
  unitCost: number;
  reorderPoint: number;
  reorderThreshold?: number;
  lastRestockDate?: string;
  vendor?: string;
  lastOrderDate: string;
  image?: string;
  createdAt: string;
  updatedAt: string;
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

const vendors = [
  { id: 'VEN-001', name: 'ProParts Supply' },
  { id: 'VEN-002', name: 'Northwind Safety' },
  { id: 'VEN-003', name: 'Metro Automation' },
];

const todayString = () => new Date().toISOString().split('T')[0];

const sampleParts: Omit<InventoryPart, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Universal Bearing',
    description: 'High durability bearing for general purpose machinery',
    category: 'Mechanical',
    sku: 'BRG-UNIV-001',
    location: 'Aisle 3, Bin 4',
    quantity: 42,
    unitCost: 18.5,
    reorderPoint: 15,
    reorderThreshold: 10,
    lastRestockDate: todayString(),
    vendor: 'VEN-001',
    lastOrderDate: todayString(),
    image: undefined,
  },
];

let parts: InventoryPart[] = sampleParts.map((part) => ({
  ...part,
  id: randomUUID(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}));

const toOptionalString = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  if (typeof value === 'number' || typeof value === 'bigint') {
    return String(value);
  }
  return undefined;
};

const toNumber = (value: unknown, fallback = 0): number => {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const toDateString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.valueOf())) return undefined;
  return parsed.toISOString().split('T')[0];
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

app.get('/api/vendors', (_req, res) => {
  res.json({ success: true, data: vendors });
});

app.get('/api/parts', (_req, res) => {
  res.json({ success: true, data: parts });
});

app.post('/api/parts', (req, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const name = toOptionalString(body.name);
  const sku = toOptionalString(body.sku);

  if (!name || !sku) {
    res.status(400).json({ message: 'Name and SKU are required' });
    return;
  }

  const now = new Date().toISOString();
  const newPart: InventoryPart = {
    id: randomUUID(),
    name,
    description: toOptionalString(body.description),
    category: toOptionalString(body.category),
    sku,
    location: toOptionalString(body.location),
    quantity: toNumber(body.quantity),
    unitCost: toNumber(body.unitCost),
    reorderPoint: toNumber(body.reorderPoint),
    reorderThreshold:
      body.reorderThreshold !== undefined ? toNumber(body.reorderThreshold) : undefined,
    lastRestockDate: toDateString(body.lastRestockDate) ?? todayString(),
    vendor: toOptionalString(body.vendor),
    lastOrderDate: toDateString(body.lastOrderDate) ?? todayString(),
    image: typeof body.image === 'string' ? body.image : undefined,
    createdAt: now,
    updatedAt: now,
  };

  parts = [...parts, newPart];
  res.status(201).json({ success: true, data: newPart });
});

app.put('/api/parts/:id', (req, res) => {
  const partIndex = parts.findIndex((p) => p.id === req.params.id);
  if (partIndex === -1) {
    res.status(404).json({ message: 'Part not found' });
    return;
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const existing = parts[partIndex];

  const updated: InventoryPart = {
    ...existing,
    name: toOptionalString(body.name) ?? existing.name,
    description: toOptionalString(body.description) ?? existing.description,
    category: toOptionalString(body.category) ?? existing.category,
    sku: toOptionalString(body.sku) ?? existing.sku,
    location: toOptionalString(body.location) ?? existing.location,
    quantity: body.quantity !== undefined ? toNumber(body.quantity, existing.quantity) : existing.quantity,
    unitCost: body.unitCost !== undefined ? toNumber(body.unitCost, existing.unitCost) : existing.unitCost,
    reorderPoint:
      body.reorderPoint !== undefined ? toNumber(body.reorderPoint, existing.reorderPoint) : existing.reorderPoint,
    reorderThreshold:
      body.reorderThreshold !== undefined
        ? toNumber(body.reorderThreshold, existing.reorderThreshold ?? 0)
        : existing.reorderThreshold,
    lastRestockDate:
      body.lastRestockDate !== undefined
        ? toDateString(body.lastRestockDate) ?? existing.lastRestockDate
        : existing.lastRestockDate,
    vendor: body.vendor !== undefined ? toOptionalString(body.vendor) : existing.vendor,
    lastOrderDate:
      body.lastOrderDate !== undefined
        ? toDateString(body.lastOrderDate) ?? existing.lastOrderDate
        : existing.lastOrderDate,
    image: typeof body.image === 'string' ? body.image : existing.image,
    updatedAt: new Date().toISOString(),
  };

  parts = parts.map((part, index) => (index === partIndex ? updated : part));
  res.json({ success: true, data: updated });
});

app.post('/api/parts/:id/adjust', (req, res) => {
  const partIndex = parts.findIndex((p) => p.id === req.params.id);
  if (partIndex === -1) {
    res.status(404).json({ message: 'Part not found' });
    return;
  }

  const delta = toNumber((req.body ?? {}).delta);
  if (!Number.isFinite(delta) || delta === 0) {
    res.status(400).json({ message: 'delta must be a non-zero number' });
    return;
  }

  const reason = toOptionalString((req.body ?? {}).reason) ?? 'Adjustment';
  const updated = {
    ...parts[partIndex],
    quantity: parts[partIndex].quantity + delta,
    updatedAt: new Date().toISOString(),
  };

  parts = parts.map((part, index) => (index === partIndex ? updated : part));
  res.json({ success: true, data: { ...updated, lastAdjustmentReason: reason } });
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
