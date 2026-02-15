"use strict";
/*
 * SPDX-License-Identifier: MIT
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTemplateForSection = exports.ADMIN_SETTING_TEMPLATES = void 0;
exports.ADMIN_SETTING_TEMPLATES = [
    {
        section: "site",
        title: "Site Configuration",
        description: "Manage departments, production lines, and station hierarchies.",
        defaultStatus: "In Progress",
        defaultConfig: {
            departments: [],
            lines: [],
            stations: [],
            allowCsvUpload: true,
            autoProvisionAssets: false,
        },
        sortOrder: 1,
        keywords: ["departments", "lines", "stations", "hierarchy", "site"],
    },
    {
        section: "roles",
        title: "Role Permissions",
        description: "Adjust user roles and the CMMS access matrix.",
        defaultStatus: "Active",
        defaultConfig: {
            roles: [
                {
                    key: "admin",
                    label: "Administrator",
                    description: "Full platform access",
                    permissions: [
                        { module: "assets", create: true, read: true, update: true, remove: true },
                        { module: "workOrders", create: true, read: true, update: true, remove: true },
                        { module: "pm", create: true, read: true, update: true, remove: true },
                        { module: "inventory", create: true, read: true, update: true, remove: true },
                    ],
                },
                {
                    key: "manager",
                    label: "Maintenance Manager",
                    description: "Coordinate teams and sign-off work",
                    permissions: [
                        { module: "assets", create: true, read: true, update: true, remove: false },
                        { module: "workOrders", create: true, read: true, update: true, remove: false },
                        { module: "pm", create: true, read: true, update: true, remove: false },
                        { module: "inventory", create: false, read: true, update: true, remove: false },
                    ],
                },
                {
                    key: "tech",
                    label: "Technician",
                    description: "Execute and close work orders",
                    permissions: [
                        { module: "assets", create: false, read: true, update: true, remove: false },
                        { module: "workOrders", create: true, read: true, update: true, remove: false },
                        { module: "pm", create: false, read: true, update: false, remove: false },
                        { module: "inventory", create: false, read: true, update: false, remove: false },
                    ],
                },
                {
                    key: "viewer",
                    label: "Viewer",
                    description: "Read-only visibility",
                    permissions: [
                        { module: "assets", create: false, read: true, update: false, remove: false },
                        { module: "workOrders", create: false, read: true, update: false, remove: false },
                        { module: "pm", create: false, read: true, update: false, remove: false },
                        { module: "inventory", create: false, read: true, update: false, remove: false },
                    ],
                },
            ],
            enforceLeastPrivilege: true,
            requireMfaForAdmins: true,
        },
        sortOrder: 2,
        keywords: ["roles", "permissions", "matrix", "access"],
    },
    {
        section: "auth",
        title: "Authentication (SSO & MFA)",
        description: "Configure SSO providers, MFA, and session policies.",
        defaultStatus: "Active",
        defaultConfig: {
            ssoProviders: { google: true, microsoft: false, okta: false },
            mfa: {
                enabled: false,
                methods: ["totp"],
                trustedDevices: true,
                issuer: "WorkPro3",
                secretMasked: null,
            },
            session: {
                durationMinutes: 480,
                idleTimeoutMinutes: 30,
            },
            passwordPolicy: {
                minLength: 12,
                requireNumbers: true,
                requireSymbols: true,
            },
        },
        sortOrder: 3,
        keywords: ["sso", "mfa", "authentication", "login", "security"],
    },
    {
        section: "audit",
        title: "Audit & Compliance",
        description: "Monitor audit trails, exports, and retention policies.",
        defaultStatus: "Active",
        defaultConfig: {
            retentionDays: 365,
            immutable: true,
            monitoredModules: ["workOrders", "assets", "inventory"],
            exports: {
                frequency: "weekly",
            },
        },
        sortOrder: 4,
        keywords: ["audit", "compliance", "logs", "retention"],
    },
    {
        section: "integrations",
        title: "Integrations / API",
        description: "Manage API keys, scopes, and webhook listeners.",
        defaultStatus: "In Progress",
        defaultConfig: {
            scopesCatalog: ["assets:read", "assets:write", "workorders:read", "workorders:write"],
            webhooks: [],
        },
        sortOrder: 5,
        keywords: ["api", "integration", "webhook", "keys"],
    },
    {
        section: "notifications",
        title: "Notifications & Escalations",
        description: "Configure alert channels and escalation policies.",
        defaultStatus: "Active",
        defaultConfig: {
            channels: { email: true, sms: true, push: true },
            escalation: [
                { level: 1, target: "Assignee", delayMinutes: 0 },
                { level: 2, target: "Team Lead", delayMinutes: 30 },
                { level: 3, target: "Maintenance Manager", delayMinutes: 60 },
            ],
            quietHours: {
                enabled: false,
                start: "22:00",
                end: "06:00",
            },
            autoCloseOnResolution: true,
        },
        sortOrder: 6,
        keywords: ["notifications", "alerts", "escalation", "sms", "email"],
    },
    {
        section: "ai",
        title: "AI & Automation",
        description: "Tune AI assistant, predictive thresholds, and automations.",
        defaultStatus: "In Progress",
        defaultConfig: {
            assistantEnabled: true,
            predictiveMaintenanceThreshold: 75,
            autoCreateWorkOrders: false,
            rootCauseLearning: true,
            models: [
                { name: "Failure prediction", status: "ready", accuracy: 0.87 },
                { name: "Parts recommendation", status: "training" },
            ],
        },
        sortOrder: 7,
        keywords: ["ai", "automation", "predictive", "assistant"],
    },
    {
        section: "iot",
        title: "IoT / PLC Data Gateways",
        description: "Connect MQTT, OPC-UA, and Modbus gateways.",
        defaultStatus: "Pending",
        defaultConfig: {
            gateways: [],
            pollingIntervalSeconds: 60,
            allowUnsecuredConnections: false,
            defaultTopicNamespace: "workpro3/plant",
        },
        sortOrder: 8,
        keywords: ["iot", "plc", "mqtt", "opc", "modbus"],
    },
    {
        section: "backup",
        title: "Backup & Restore",
        description: "Schedule backups, retention, and snapshot restores.",
        defaultStatus: "Active",
        defaultConfig: {
            automatic: {
                enabled: true,
                schedule: "daily",
            },
            retentionDays: 30,
            snapshots: [],
        },
        sortOrder: 9,
        keywords: ["backup", "restore", "retention", "snapshot"],
    },
    {
        section: "branding",
        title: "Branding & Localization",
        description: "Tailor logo, palette, and regional preferences.",
        defaultStatus: "In Progress",
        defaultConfig: {
            logoUrl: null,
            primaryColor: "#4f46e5",
            accentColor: "#06b6d4",
            currency: "USD",
            timezone: "America/New_York",
            language: "en",
            supportEmail: "support@workpro3.example",
            whiteLabelDomains: [],
        },
        sortOrder: 10,
        keywords: ["branding", "localization", "theme", "timezone"],
    },
];
const getTemplateForSection = (section) => exports.ADMIN_SETTING_TEMPLATES.find((entry) => entry.section === section);
exports.getTemplateForSection = getTemplateForSection;
