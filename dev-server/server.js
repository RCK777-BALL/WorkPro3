"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const logger_1 = __importDefault(require("./logger"));
const crypto_1 = require("node:crypto");
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
const pmTemplateLibrary = [
    {
        id: 'boiler-efficiency',
        title: 'Boiler efficiency inspection',
        description: 'Dial in routine PM for your boilers with safety checks and trending.',
        category: 'Utilities',
        interval: 'Weekly',
        impact: 'Keeps boilers tuned while catching safety issues before downtime.',
        checklist: [
            'Inspect flame quality and log readings',
            'Verify relief valve and low water cutoffs',
            'Record flue gas temperature and draft',
            'Check burner air mix and clean igniters',
            'Document stack O2/CO for trending',
        ],
        rule: { type: 'calendar', cron: '0 4 * * 1' },
    },
    {
        id: 'ahu-cleaning',
        title: 'Air handling unit cleaning',
        description: 'Prefill a full coil cleaning, filter swap, and logging steps.',
        category: 'Air handling',
        interval: 'Monthly',
        impact: 'Improves airflow and keeps AHU coils clean for energy efficiency.',
        checklist: [
            'Remove and dispose of dirty filters',
            'Clean supply and return coils',
            'Check belt tension and sheave alignment',
            'Inspect drain pans and clear condensate',
            'Log supply/return temperature differential',
        ],
        rule: { type: 'calendar', cron: '0 5 1 * *' },
    },
    {
        id: 'compressor-performance',
        title: 'Compressor performance capture',
        description: 'Quick win to log compressor health and spot air leaks.',
        category: 'Compressor',
        interval: 'Quarterly',
        impact: 'Captures baseline performance data to prevent surprises.',
        checklist: [
            'Capture amperage and discharge pressure',
            'Inspect inlet filters and oil levels',
            'Test condensate traps and drains',
            'Walkdown for audible air leaks',
            'Record dryer dew point and alarms',
        ],
        rule: { type: 'calendar', cron: '0 6 1 */3 *' },
    },
];
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
app.get('/api/templates/library', (_req, res) => {
    res.json({ success: true, data: pmTemplateLibrary });
});
app.post('/api/templates/library/:templateId/clone', (req, res) => {
    const template = pmTemplateLibrary.find((item) => item.id === req.params.templateId);
    if (!template) {
        res.status(404).json({ message: 'Template not found' });
        return;
    }
    const checklistNote = template.checklist.length
        ? `\n\nChecklist:\n${template.checklist.map((item) => `• ${item}`).join('\n')}`
        : '';
    res.status(201).json({
        success: true,
        data: {
            id: (0, crypto_1.randomUUID)(),
            title: template.title,
            notes: `${template.description}\n${template.impact}${checklistNote}`.trim(),
            active: true,
            assignments: [],
        },
    });
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
