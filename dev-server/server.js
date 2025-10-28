"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const logger_1 = __importDefault(require("./logger"));
const db_1 = require("../backend/config/db");
const defaultSettings = {
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
let settingsState = {
    general: Object.assign({}, defaultSettings.general),
    notifications: Object.assign({}, defaultSettings.notifications),
    email: Object.assign({}, defaultSettings.email),
    theme: Object.assign({}, defaultSettings.theme),
};
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
// This lightweight server is intended for local development only.
// Its CORS configuration mirrors the main backend so the frontend behaves the same.
const allowedOrigin = (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim());
const corsOptions = {
    origin: (origin, cb) => {
        if (!origin || allowedOrigin.includes(origin))
            return cb(null, true);
        return cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
};
// Middleware
app.use((0, cors_1.default)(corsOptions));
app.use(express_1.default.json());
// Routes
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
});
app.get('/api/settings', (_req, res) => {
    res.json({ data: settingsState });
});
app.post('/api/settings', (req, res) => {
    const payload = (req.body ?? {});
    settingsState = {
        general: Object.assign(Object.assign({}, settingsState.general), (payload.general ?? {})),
        notifications: Object.assign(Object.assign({}, settingsState.notifications), (payload.notifications ?? {})),
        email: Object.assign(Object.assign({}, settingsState.email), (payload.email ?? {})),
        theme: Object.assign(Object.assign({}, settingsState.theme), (payload.theme ?? {})),
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
        await (0, db_1.connectDB)();
        logger_1.default.info('MongoDB connected');
    }
    catch (err) {
        logger_1.default.error('MongoDB connection error:', err);
        process.exit(1);
    }
    try {
        const server = app.listen(PORT, () => {
            logger_1.default.info(`Server running on port ${PORT}`);
        });
        server.on('error', (err) => {
            logger_1.default.error('Server failed to start:', err);
        });
    }
    catch (err) {
        logger_1.default.error('Server startup error:', err);
        process.exit(1);
    }
};
void startServer();
