/*
 * SPDX-License-Identifier: MIT
 */

export type AdminSettingSection =
  | "site"
  | "roles"
  | "auth"
  | "audit"
  | "integrations"
  | "notifications"
  | "ai"
  | "iot"
  | "backup"
  | "branding";

export type AdminSettingStatus =
  | "Active"
  | "In Progress"
  | "Pending"
  | "Disabled"
  | "Completed";

export interface SiteNode {
  id: string;
  name: string;
  parentId?: string | null;
  manager?: string;
}

export interface SiteConfiguration {
  departments: SiteNode[];
  lines: SiteNode[];
  stations: SiteNode[];
  allowCsvUpload: boolean;
  autoProvisionAssets: boolean;
  lastImport?: {
    at: string;
    by: string;
  };
}

export type RolePermissionModule = "assets" | "workOrders" | "pm" | "inventory";

export interface RolePermission {
  module: RolePermissionModule;
  create: boolean;
  read: boolean;
  update: boolean;
  remove: boolean;
}

export interface RoleDefinition {
  key: string;
  label: string;
  description: string;
  permissions: RolePermission[];
}

export interface RolePermissionsConfig {
  roles: RoleDefinition[];
  enforceLeastPrivilege: boolean;
  requireMfaForAdmins: boolean;
  lastReviewAt?: string;
}

export interface AuthenticationConfig {
  ssoProviders: {
    google: boolean;
    microsoft: boolean;
    okta: boolean;
  };
  mfa: {
    enabled: boolean;
    methods: Array<"totp" | "email">;
    trustedDevices: boolean;
    issuer: string;
    secretMasked?: string | null;
  };
  session: {
    durationMinutes: number;
    idleTimeoutMinutes: number;
  };
  passwordPolicy: {
    minLength: number;
    requireNumbers: boolean;
    requireSymbols: boolean;
  };
}

export interface AuditComplianceConfig {
  retentionDays: number;
  immutable: boolean;
  monitoredModules: string[];
  exports: {
    frequency: "daily" | "weekly" | "monthly";
    lastExportAt?: string;
  };
}

export interface IntegrationWebhook {
  id: string;
  url: string;
  active: boolean;
  events: string[];
}

export interface IntegrationConfig {
  scopesCatalog: string[];
  webhooks: IntegrationWebhook[];
  lastKeyRotation?: string;
}

export interface EscalationRule {
  level: number;
  target: string;
  delayMinutes: number;
}

export interface NotificationRulesConfig {
  channels: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  escalation: EscalationRule[];
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
  autoCloseOnResolution: boolean;
}

export interface ModelStatus {
  name: string;
  status: "training" | "ready" | "error";
  accuracy?: number;
}

export interface AiAutomationConfig {
  assistantEnabled: boolean;
  predictiveMaintenanceThreshold: number;
  autoCreateWorkOrders: boolean;
  rootCauseLearning: boolean;
  models: ModelStatus[];
  lastTrainingRun?: string;
}

export interface GatewayMapping {
  id: string;
  protocol: "MQTT" | "OPC-UA" | "Modbus";
  endpoint: string;
  assets: string[];
  status: "online" | "offline" | "degraded";
}

export interface IoTGatewayConfig {
  gateways: GatewayMapping[];
  pollingIntervalSeconds: number;
  allowUnsecuredConnections: boolean;
  defaultTopicNamespace: string;
}

export interface BackupSnapshot {
  id: string;
  createdAt: string;
  createdBy: string;
}

export interface BackupConfig {
  automatic: {
    enabled: boolean;
    schedule: "hourly" | "daily" | "weekly";
  };
  retentionDays: number;
  lastBackupAt?: string;
  lastRestore?: {
    at: string;
    by: string;
  };
  snapshots: BackupSnapshot[];
}

export interface BrandingConfig {
  logoUrl?: string | null;
  primaryColor: string;
  accentColor: string;
  currency: string;
  timezone: string;
  language: string;
  supportEmail: string;
  whiteLabelDomains: string[];
}

export interface AdminSettingConfigs {
  site: SiteConfiguration;
  roles: RolePermissionsConfig;
  auth: AuthenticationConfig;
  audit: AuditComplianceConfig;
  integrations: IntegrationConfig;
  notifications: NotificationRulesConfig;
  ai: AiAutomationConfig;
  iot: IoTGatewayConfig;
  backup: BackupConfig;
  branding: BrandingConfig;
}

export interface AdminSettingTemplate<Section extends AdminSettingSection> {
  section: Section;
  title: string;
  description: string;
  defaultStatus: AdminSettingStatus;
  defaultConfig: AdminSettingConfigs[Section];
  sortOrder: number;
  keywords: string[];
}

export type AdminSettingDetailMap = {
  [Section in AdminSettingSection]: {
    section: Section;
    title: string;
    description: string;
    status: AdminSettingStatus;
    updatedAt?: string;
    updatedBy?: string;
    updatedByName?: string;
    config: AdminSettingConfigs[Section];
    metadata?: Record<string, unknown>;
  };
};

export type AdminSettingDetail = AdminSettingDetailMap[AdminSettingSection];

export interface ApiKeySummary {
  id: string;
  label: string;
  lastFour: string;
  scopes: string[];
  status: "active" | "revoked";
  createdAt: string;
  createdBy?: string;
  createdByName?: string;
  expiresAt?: string;
}

export interface AdminSettingsPayload {
  sections: AdminSettingDetail[];
  apiKeys: ApiKeySummary[];
}

export interface CreateApiKeyResponse {
  id: string;
  key: string;
  lastFour: string;
}

export type AdminSettingsUpdatePayload<Section extends AdminSettingSection = AdminSettingSection> = {
  status?: AdminSettingStatus;
  config?: AdminSettingConfigs[Section];
  reset?: boolean;
};

export const ADMIN_SETTING_TEMPLATES: ReadonlyArray<AdminSettingTemplate<AdminSettingSection>> = [
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
] as const;

export const getTemplateForSection = (
  section: AdminSettingSection,
): AdminSettingTemplate<AdminSettingSection> | undefined =>
  ADMIN_SETTING_TEMPLATES.find((entry) => entry.section === section);

