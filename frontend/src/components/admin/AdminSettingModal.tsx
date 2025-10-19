/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Button from "@/components/common/Button";
import StatusBadge from "@/components/common/StatusBadge";
import {
  Activity,
  AlertTriangle,
  Bot,
  Building2,
  Clock,
  Cpu,
  Database,
  KeyRound,
  Layers,
  Palette,
  RefreshCw,
  Save,
  Shield,
  ShieldCheck,
  SignalHigh,
  SlidersHorizontal,
  Users,
  Webhook,
  X,
  Zap,
} from "lucide-react";
import toast from "react-hot-toast";

import type {
  AdminSettingConfigs,
  AdminSettingDetail,
  AdminSettingSection,
  AdminSettingStatus,
  AdminSettingsUpdatePayload,
  ApiKeySummary,
  AuthenticationConfig,
  BackupConfig,
  BrandingConfig,
  CreateApiKeyResponse,
  GatewayMapping,
  IntegrationConfig,
  IoTGatewayConfig,
  NotificationRulesConfig,
  RolePermission,
  RolePermissionModule,
  RolePermissionsConfig,
  SiteConfiguration,
} from "@shared/admin";

const statusOptions: AdminSettingStatus[] = [
  "Active",
  "In Progress",
  "Pending",
  "Disabled",
  "Completed",
];

const iconBySection: Record<AdminSettingSection, JSX.Element> = {
  site: <Building2 className="h-5 w-5" />,
  roles: <ShieldCheck className="h-5 w-5" />,
  auth: <Shield className="h-5 w-5" />,
  audit: <Activity className="h-5 w-5" />,
  integrations: <KeyRound className="h-5 w-5" />,
  notifications: <AlertTriangle className="h-5 w-5" />,
  ai: <Bot className="h-5 w-5" />,
  iot: <Cpu className="h-5 w-5" />,
  backup: <Database className="h-5 w-5" />,
  branding: <Palette className="h-5 w-5" />,
};

const deepClone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

const randomId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

type SectionConfig = AdminSettingConfigs[AdminSettingSection];

type CreateKeyPayload = {
  label: string;
  scopes: string[];
  expiresAt?: string;
};

type AdminSettingModalProps = {
  open: boolean;
  setting?: AdminSettingDetail;
  apiKeys?: ApiKeySummary[];
  onClose: () => void;
  onSubmit: (
    section: AdminSettingSection,
    payload: AdminSettingsUpdatePayload,
  ) => Promise<AdminSettingDetail | void>;
  onReset: (section: AdminSettingSection) => Promise<AdminSettingDetail | void>;
  onCreateApiKey?: (payload: CreateKeyPayload) => Promise<CreateApiKeyResponse>;
  onRevokeApiKey?: (id: string) => Promise<void>;
  isSaving?: boolean;
  isResetting?: boolean;
  isCreatingKey?: boolean;
  revokingKeyId?: string | null;
};

type StatusTone = {
  badge: string;
  chip: string;
  label: string;
};

const statusTone: Record<AdminSettingStatus, StatusTone> = {
  Active: {
    badge: "text-emerald-400",
    chip: "bg-emerald-500/10 border border-emerald-500/40 text-emerald-300",
    label: "Operational",
  },
  "In Progress": {
    badge: "text-amber-400",
    chip: "bg-amber-500/10 border border-amber-500/40 text-amber-300",
    label: "In Flight",
  },
  Pending: {
    badge: "text-sky-400",
    chip: "bg-sky-500/10 border border-sky-500/40 text-sky-300",
    label: "Queued",
  },
  Disabled: {
    badge: "text-rose-400",
    chip: "bg-rose-500/10 border border-rose-500/40 text-rose-300",
    label: "Disabled",
  },
  Completed: {
    badge: "text-emerald-400",
    chip: "bg-emerald-500/10 border border-emerald-500/40 text-emerald-300",
    label: "Complete",
  },
};

const FieldGroup = ({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) => (
  <section className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-4">
    <header className="mb-3 space-y-1">
      <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-200">{title}</h4>
      {description && <p className="text-xs text-slate-400">{description}</p>}
    </header>
    <div className="space-y-3 text-sm text-slate-200">{children}</div>
  </section>
);

const TextInput = ({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) => (
  <label className="flex flex-col gap-1 text-xs">
    <span className="font-medium uppercase tracking-wide text-slate-400">{label}</span>
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      type={type}
      placeholder={placeholder}
      className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
    />
  </label>
);

const CheckboxField = ({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) => (
  <label className="flex items-start gap-3 text-sm text-slate-200">
    <input
      type="checkbox"
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
      className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-900 text-indigo-500 focus:ring-indigo-500"
    />
    <span>
      <span className="font-medium text-slate-200">{label}</span>
      {description && <p className="text-xs text-slate-400">{description}</p>}
    </span>
  </label>
);

const NumberInput = ({
  label,
  value,
  onChange,
  min = 0,
  max,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) => (
  <TextInput
    label={label}
    value={value}
    onChange={(raw) => {
      const parsed = Number(raw);
      if (Number.isNaN(parsed)) {
        onChange(min);
        return;
      }
      if (max !== undefined && parsed > max) {
        onChange(max);
        return;
      }
      if (parsed < min) {
        onChange(min);
        return;
      }
      onChange(parsed);
    }}
    type="number"
  />
);

const SelectField = ({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ label: string; value: string }>;
  onChange: (value: string) => void;
}) => (
  <label className="flex flex-col gap-1 text-xs">
    <span className="font-medium uppercase tracking-wide text-slate-400">{label}</span>
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value} className="bg-slate-900 text-slate-200">
          {option.label}
        </option>
      ))}
    </select>
  </label>
);

const SectionDivider = () => <div className="my-4 h-px bg-slate-800" />;

function renderSiteSection(
  config: SiteConfiguration,
  mutate: (updater: (next: SiteConfiguration) => void) => void,
) {
  const updateNode = (
    collection: "departments" | "lines" | "stations",
    index: number,
    key: "name" | "manager" | "parentId",
    value: string,
  ) => {
    mutate((draft) => {
      const target = draft[collection][index];
      if (!target) return;
      if (key === "parentId") {
        target.parentId = value || undefined;
      } else if (key === "manager") {
        target.manager = value || undefined;
      } else {
        target.name = value;
      }
    });
  };

  const addNode = (collection: "departments" | "lines" | "stations") => {
    mutate((draft) => {
      draft[collection] = [
        ...draft[collection],
        {
          id: randomId(collection.slice(0, 3)),
          name: "",
          parentId: collection === "departments" ? null : undefined,
        },
      ];
    });
  };

  const removeNode = (collection: "departments" | "lines" | "stations", index: number) => {
    mutate((draft) => {
      draft[collection] = draft[collection].filter((_, idx) => idx !== index);
    });
  };

  return (
    <div className="space-y-4">
      <FieldGroup
        title="Hierarchy Controls"
        description="Define the production topology of your plant including departments, lines, and stations."
      >
        <div className="grid gap-4 md:grid-cols-3">
          {(["departments", "lines", "stations"] as const).map((collection) => (
            <div key={collection} className="space-y-2">
              <div className="flex items-center justify-between">
                <h5 className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                  {collection.charAt(0).toUpperCase() + collection.slice(1)}
                </h5>
                <button
                  type="button"
                  onClick={() => addNode(collection)}
                  className="flex items-center gap-1 rounded-md border border-slate-700 bg-slate-950/70 px-2 py-1 text-xs font-medium text-slate-200 hover:border-indigo-500 hover:text-indigo-200"
                >
                  <Layers className="h-3 w-3" />
                  Add
                </button>
              </div>
              <div className="space-y-3">
                {config[collection].length === 0 && (
                  <p className="text-xs text-slate-500">No {collection} defined yet.</p>
                )}
                {config[collection].map((node, index) => (
                  <div key={node.id ?? index} className="rounded-lg border border-slate-800 bg-slate-950/80 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <TextInput
                        label="Name"
                        value={node.name}
                        onChange={(value) => updateNode(collection, index, "name", value)}
                      />
                      <button
                        type="button"
                        aria-label={`Remove ${collection.slice(0, -1)}`}
                        onClick={() => removeNode(collection, index)}
                        className="mt-5 rounded-md border border-slate-800 p-1 text-slate-400 hover:border-rose-500/50 hover:text-rose-300"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    {collection !== "departments" && (
                      <TextInput
                        label="Parent"
                        value={node.parentId ?? ""}
                        onChange={(value) => updateNode(collection, index, "parentId", value)}
                        placeholder="Department or line ID"
                      />
                    )}
                    {collection !== "stations" && (
                      <TextInput
                        label="Manager"
                        value={node.manager ?? ""}
                        onChange={(value) => updateNode(collection, index, "manager", value)}
                        placeholder="Owner name or email"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </FieldGroup>
      <FieldGroup title="Automation">
        <CheckboxField
          label="Allow CSV hierarchy upload"
          description="Enable bulk site onboarding from spreadsheets."
          checked={config.allowCsvUpload}
          onChange={(value) =>
            mutate((draft) => {
              draft.allowCsvUpload = value;
            })
          }
        />
        <CheckboxField
          label="Auto-provision assets"
          description="Automatically link uploaded site nodes with asset placeholders."
          checked={config.autoProvisionAssets}
          onChange={(value) =>
            mutate((draft) => {
              draft.autoProvisionAssets = value;
            })
          }
        />
      </FieldGroup>
    </div>
  );
}

function renderRolesSection(
  config: RolePermissionsConfig,
  mutate: (updater: (next: RolePermissionsConfig) => void) => void,
) {
  const modules: RolePermissionModule[] = ["assets", "workOrders", "pm", "inventory"];
  const togglePermission = (
    roleIndex: number,
    module: RolePermissionModule,
    permission: keyof RolePermission,
    value: boolean,
  ) => {
    mutate((draft) => {
      const role = draft.roles[roleIndex];
      if (!role) return;
      const modulePerm = role.permissions.find((entry) => entry.module === module);
      if (!modulePerm) return;
      modulePerm[permission] = value;
    });
  };

  const updateRoleMeta = (index: number, key: "label" | "description", value: string) => {
    mutate((draft) => {
      if (!draft.roles[index]) return;
      draft.roles[index] = {
        ...draft.roles[index],
        [key]: value,
      };
    });
  };

  return (
    <div className="space-y-4">
      <FieldGroup
        title="Role Catalogue"
        description="Fine-tune CMMS capabilities for each persona."
      >
        <div className="overflow-hidden rounded-xl border border-slate-800">
          <table className="min-w-full divide-y divide-slate-800 text-sm">
            <thead className="bg-slate-950/70 text-left text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Description</th>
                {modules.map((module) => (
                  <th key={module} className="px-4 py-3 text-center capitalize">
                    {module.replace(/([A-Z])/g, " $1")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-950/40">
              {config.roles.map((role, index) => (
                <tr key={role.key} className="text-slate-200">
                  <td className="px-4 py-3 align-top">
                    <TextInput label="Label" value={role.label} onChange={(value) => updateRoleMeta(index, "label", value)} />
                  </td>
                  <td className="px-4 py-3 align-top">
                    <TextInput
                      label="Summary"
                      value={role.description}
                      onChange={(value) => updateRoleMeta(index, "description", value)}
                    />
                  </td>
                  {modules.map((module) => {
                    const permissions = role.permissions.find((entry) => entry.module === module);
                    return (
                      <td key={module} className="px-4 py-3">
                        {permissions ? (
                          <div className="grid grid-cols-2 gap-2">
                            {(["create", "read", "update", "remove"] as const).map((perm) => (
                              <label key={perm} className="flex items-center gap-2 text-xs text-slate-300">
                                <input
                                  type="checkbox"
                                  checked={permissions[perm]}
                                  onChange={(event) => togglePermission(index, module, perm, event.target.checked)}
                                  className="h-3.5 w-3.5 rounded border-slate-600 bg-slate-900 text-indigo-500 focus:ring-indigo-500"
                                />
                                <span className="capitalize">{perm}</span>
                              </label>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500">No mapping</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </FieldGroup>
      <FieldGroup title="Governance">
        <CheckboxField
          label="Enforce least privilege"
          description="Auto-suggest role hardening for unused permissions."
          checked={config.enforceLeastPrivilege}
          onChange={(value) =>
            mutate((draft) => {
              draft.enforceLeastPrivilege = value;
            })
          }
        />
        <CheckboxField
          label="Require MFA for administrators"
          description="Admin accounts must enroll in MFA before accessing sensitive modules."
          checked={config.requireMfaForAdmins}
          onChange={(value) =>
            mutate((draft) => {
              draft.requireMfaForAdmins = value;
            })
          }
        />
      </FieldGroup>
    </div>
  );
}

function renderAuthSection(
  config: AuthenticationConfig,
  mutate: (updater: (next: AuthenticationConfig) => void) => void,
) {
  const toggleProvider = (key: keyof AuthenticationConfig["ssoProviders"], value: boolean) => {
    mutate((draft) => {
      draft.ssoProviders[key] = value;
    });
  };

  const toggleMfaMethod = (method: "totp" | "email", value: boolean) => {
    mutate((draft) => {
      const methods = new Set(draft.mfa.methods);
      if (value) {
        methods.add(method);
      } else {
        methods.delete(method);
      }
      draft.mfa.methods = Array.from(methods);
    });
  };

  return (
    <div className="space-y-4">
      <FieldGroup title="Single Sign-On">
        <div className="grid gap-3 md:grid-cols-3">
          <CheckboxField
            label="Google Workspace"
            checked={config.ssoProviders.google}
            onChange={(value) => toggleProvider("google", value)}
          />
          <CheckboxField
            label="Microsoft Entra ID"
            checked={config.ssoProviders.microsoft}
            onChange={(value) => toggleProvider("microsoft", value)}
          />
          <CheckboxField label="Okta" checked={config.ssoProviders.okta} onChange={(value) => toggleProvider("okta", value)} />
        </div>
      </FieldGroup>
      <FieldGroup title="Multi-factor Authentication">
        <CheckboxField
          label="Require MFA"
          description="Gate critical actions behind secondary verification."
          checked={config.mfa.enabled}
          onChange={(value) =>
            mutate((draft) => {
              draft.mfa.enabled = value;
            })
          }
        />
        <div className="grid gap-3 md:grid-cols-3">
          <CheckboxField
            label="Authenticator (TOTP)"
            checked={config.mfa.methods.includes("totp")}
            onChange={(value) => toggleMfaMethod("totp", value)}
          />
          <CheckboxField
            label="Email one-time codes"
            checked={config.mfa.methods.includes("email")}
            onChange={(value) => toggleMfaMethod("email", value)}
          />
          <CheckboxField
            label="Remember trusted devices"
            checked={config.mfa.trustedDevices}
            onChange={(value) =>
              mutate((draft) => {
                draft.mfa.trustedDevices = value;
              })
            }
          />
        </div>
        <TextInput
          label="Issuer"
          value={config.mfa.issuer}
          onChange={(value) =>
            mutate((draft) => {
              draft.mfa.issuer = value;
            })
          }
          placeholder="WorkPro3"
        />
      </FieldGroup>
      <FieldGroup title="Session Controls">
        <div className="grid gap-4 md:grid-cols-2">
          <NumberInput
            label="Session duration (minutes)"
            value={config.session.durationMinutes}
            min={15}
            max={1440}
            onChange={(value) =>
              mutate((draft) => {
                draft.session.durationMinutes = value;
              })
            }
          />
          <NumberInput
            label="Idle timeout (minutes)"
            value={config.session.idleTimeoutMinutes}
            min={5}
            max={480}
            onChange={(value) =>
              mutate((draft) => {
                draft.session.idleTimeoutMinutes = value;
              })
            }
          />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <NumberInput
            label="Password length"
            value={config.passwordPolicy.minLength}
            min={8}
            max={128}
            onChange={(value) =>
              mutate((draft) => {
                draft.passwordPolicy.minLength = value;
              })
            }
          />
          <CheckboxField
            label="Require numbers"
            checked={config.passwordPolicy.requireNumbers}
            onChange={(value) =>
              mutate((draft) => {
                draft.passwordPolicy.requireNumbers = value;
              })
            }
          />
          <CheckboxField
            label="Require symbols"
            checked={config.passwordPolicy.requireSymbols}
            onChange={(value) =>
              mutate((draft) => {
                draft.passwordPolicy.requireSymbols = value;
              })
            }
          />
        </div>
      </FieldGroup>
    </div>
  );
}

function renderAuditSection(
  config: AdminSettingConfigs["audit"],
  mutate: (updater: (next: AdminSettingConfigs["audit"]) => void) => void,
) {
  return (
    <div className="space-y-4">
      <FieldGroup title="Retention">
        <NumberInput
          label="Retention days"
          value={config.retentionDays}
          min={30}
          max={1825}
          onChange={(value) =>
            mutate((draft) => {
              draft.retentionDays = value;
            })
          }
        />
        <CheckboxField
          label="Immutable logs"
          description="Disallow retroactive tampering of audit events."
          checked={config.immutable}
          onChange={(value) =>
            mutate((draft) => {
              draft.immutable = value;
            })
          }
        />
      </FieldGroup>
      <FieldGroup title="Scope">
        <div className="flex flex-wrap gap-2">
          {config.monitoredModules.map((module, index) => (
            <span
              key={`${module}-${index}`}
              className="inline-flex items-center gap-2 rounded-full border border-indigo-500/40 bg-indigo-500/10 px-3 py-1 text-xs text-indigo-200"
            >
              {module}
              <button
                type="button"
                onClick={() =>
                  mutate((draft) => {
                    draft.monitoredModules = draft.monitoredModules.filter((_, idx) => idx !== index);
                  })
                }
                className="rounded-full border border-transparent p-1 text-indigo-200/80 transition hover:border-indigo-400 hover:bg-indigo-500/20"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() =>
              mutate((draft) => {
                draft.monitoredModules = Array.from(new Set([...draft.monitoredModules, "workOrders"]));
              })
            }
            className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-950/70 px-3 py-2 text-xs font-semibold text-indigo-200 hover:border-indigo-500"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Add Work Orders
          </button>
          <button
            type="button"
            onClick={() =>
              mutate((draft) => {
                draft.monitoredModules = Array.from(new Set([...draft.monitoredModules, "inventory"]));
              })
            }
            className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-950/70 px-3 py-2 text-xs font-semibold text-indigo-200 hover:border-indigo-500"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Add Inventory
          </button>
        </div>
      </FieldGroup>
      <FieldGroup title="Exports">
        <SelectField
          label="Frequency"
          value={config.exports.frequency}
          options={[
            { label: "Daily", value: "daily" },
            { label: "Weekly", value: "weekly" },
            { label: "Monthly", value: "monthly" },
          ]}
          onChange={(value) =>
            mutate((draft) => {
              draft.exports.frequency = value as typeof config.exports.frequency;
            })
          }
        />
        <p className="text-xs text-slate-400">
          Last export: {config.exports.lastExportAt ? new Date(config.exports.lastExportAt).toLocaleString() : "No exports yet"}
        </p>
      </FieldGroup>
    </div>
  );
}
function renderIntegrationsSection(
  config: IntegrationConfig,
  apiKeys: ApiKeySummary[] | undefined,
  formState: CreateKeyPayload,
  setFormState: (updater: (prev: CreateKeyPayload) => CreateKeyPayload) => void,
  generatedKey: CreateApiKeyResponse | null,
  setGeneratedKey: (value: CreateApiKeyResponse | null) => void,
  mutate: (updater: (next: IntegrationConfig) => void) => void,
  onCreateApiKey?: (payload: CreateKeyPayload) => Promise<CreateApiKeyResponse>,
  onRevokeApiKey?: (id: string) => Promise<void>,
  isCreatingKey?: boolean,
  revokingKeyId?: string | null,
) {
  const toggleScope = (scope: string, enabled: boolean) => {
    setFormState((current) => {
      const scopes = new Set(current.scopes);
      if (enabled) {
        scopes.add(scope);
      } else {
        scopes.delete(scope);
      }
      return { ...current, scopes: Array.from(scopes) };
    });
  };

  const createKey = async () => {
    if (!onCreateApiKey) return;
    if (!formState.label.trim()) {
      toast.error("Provide a label for the API key");
      return;
    }
    if (formState.scopes.length === 0) {
      toast.error("Select at least one scope");
      return;
    }
    try {
      const result = await onCreateApiKey(formState);
      if (result) {
        setGeneratedKey(result);
        setFormState(() => ({ label: "", scopes: [], expiresAt: undefined }));
        toast.success("API key generated");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create API key");
    }
  };

  const revoke = async (id: string) => {
    if (!onRevokeApiKey) return;
    try {
      await onRevokeApiKey(id);
      toast.success("API key revoked");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to revoke key");
    }
  };

  const addWebhook = () => {
    mutate((draft) => {
      draft.webhooks = [
        ...draft.webhooks,
        {
          id: randomId("wh"),
          url: "https://",
          active: true,
          events: ["workorder.created"],
        },
      ];
    });
  };

  const updateWebhook = (index: number, key: "url" | "active", value: string | boolean) => {
    mutate((draft) => {
      const target = draft.webhooks[index];
      if (!target) return;
      if (key === "url" && typeof value === "string") {
        target.url = value;
      }
      if (key === "active" && typeof value === "boolean") {
        target.active = value;
      }
    });
  };

  const removeWebhook = (index: number) => {
    mutate((draft) => {
      draft.webhooks = draft.webhooks.filter((_, idx) => idx !== index);
    });
  };

  return (
    <div className="space-y-4">
      <FieldGroup title="API Key Management" description="Issue and rotate scoped tokens for partner integrations.">
        <div className="grid gap-4 md:grid-cols-2">
          <TextInput
            label="Key label"
            value={formState.label}
            onChange={(value) => setFormState((current) => ({ ...current, label: value }))}
            placeholder="Integration friendly name"
          />
          <TextInput
            label="Expiration (optional)"
            value={formState.expiresAt ?? ""}
            onChange={(value) => setFormState((current) => ({ ...current, expiresAt: value || undefined }))}
            placeholder="2025-12-31"
            type="date"
          />
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Scopes</p>
          <div className="flex flex-wrap gap-2">
            {config.scopesCatalog.map((scope) => (
              <label key={scope} className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950/80 px-3 py-1.5 text-xs text-slate-200">
                <input
                  type="checkbox"
                  checked={formState.scopes.includes(scope)}
                  onChange={(event) => toggleScope(scope, event.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-600 bg-slate-900 text-indigo-500 focus:ring-indigo-500"
                />
                {scope}
              </label>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" icon={<KeyRound className="h-4 w-4" />} onClick={createKey} loading={isCreatingKey}>
            Generate key
          </Button>
          {generatedKey && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
              <KeyRound className="h-4 w-4" />
              <span className="font-mono">{generatedKey.key}</span>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard?.writeText(generatedKey.key);
                  toast.success("Copied API key to clipboard");
                }}
                className="rounded-md border border-emerald-400/40 px-2 py-1 text-emerald-200 hover:bg-emerald-500/20"
              >
                Copy
              </button>
            </div>
          )}
        </div>
      </FieldGroup>
      <FieldGroup title="Active Keys">
        <div className="overflow-hidden rounded-xl border border-slate-800">
          <table className="min-w-full divide-y divide-slate-800 text-sm">
            <thead className="bg-slate-950/70 text-left text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">Label</th>
                <th className="px-4 py-3">Scopes</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-950/40">
              {apiKeys && apiKeys.length > 0 ? (
                apiKeys.map((key) => (
                  <tr key={key.id} className="text-slate-200">
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-medium">{key.label}</span>
                        <span className="text-xs text-slate-500">•••• {key.lastFour}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {key.scopes.map((scope) => (
                          <span key={scope} className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-xs text-indigo-200">
                            {scope}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {new Date(key.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={key.status === "active" ? "Active" : "Disabled"} size="sm" />
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => revoke(key.id)}
                        disabled={revokingKeyId === key.id}
                        loading={revokingKeyId === key.id}
                      >
                        Revoke
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-5 text-center text-xs text-slate-500">
                    No API keys have been generated for this tenant yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </FieldGroup>
      <FieldGroup title="Webhook Subscriptions">
        <div className="space-y-4">
          {config.webhooks.length === 0 && <p className="text-xs text-slate-500">No webhooks configured.</p>}
          {config.webhooks.map((webhook, index) => (
            <div key={webhook.id} className="rounded-xl border border-slate-800 bg-slate-950/80 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <TextInput label="URL" value={webhook.url} onChange={(value) => updateWebhook(index, "url", value)} />
                <CheckboxField
                  label="Active"
                  checked={webhook.active}
                  onChange={(value) => updateWebhook(index, "active", value)}
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {webhook.events.map((event, eventIndex) => (
                  <span
                    key={`${event}-${eventIndex}`}
                    className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-200"
                  >
                    {event}
                  </span>
                ))}
              </div>
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => removeWebhook(index)}
                  className="flex items-center gap-1 rounded-md border border-rose-500/40 px-3 py-1 text-xs text-rose-200 hover:bg-rose-500/20"
                >
                  <X className="h-3 w-3" />
                  Remove
                </button>
              </div>
            </div>
          ))}
          <Button variant="secondary" icon={<Webhook className="h-4 w-4" />} onClick={addWebhook}>
            Add webhook
          </Button>
        </div>
      </FieldGroup>
    </div>
  );
}
function renderNotificationsSection(
  config: NotificationRulesConfig,
  mutate: (updater: (next: NotificationRulesConfig) => void) => void,
) {
  const updateChannel = (channel: keyof NotificationRulesConfig["channels"], value: boolean) => {
    mutate((draft) => {
      draft.channels[channel] = value;
    });
  };

  const updateEscalation = (index: number, key: "level" | "target" | "delayMinutes", value: string) => {
    mutate((draft) => {
      const rule = draft.escalation[index];
      if (!rule) return;
      if (key === "target") {
        rule.target = value;
      } else if (key === "delayMinutes") {
        rule.delayMinutes = Number(value) || 0;
      } else {
        rule.level = Number(value) || 0;
      }
    });
  };

  const removeEscalation = (index: number) => {
    mutate((draft) => {
      draft.escalation = draft.escalation.filter((_, idx) => idx !== index);
    });
  };

  const addEscalation = () => {
    mutate((draft) => {
      draft.escalation = [
        ...draft.escalation,
        {
          level: draft.escalation.length + 1,
          target: "Manager",
          delayMinutes: 30,
        },
      ];
    });
  };

  return (
    <div className="space-y-4">
      <FieldGroup title="Channels">
        <div className="grid gap-3 md:grid-cols-3">
          <CheckboxField label="Email" checked={config.channels.email} onChange={(value) => updateChannel("email", value)} />
          <CheckboxField label="SMS" checked={config.channels.sms} onChange={(value) => updateChannel("sms", value)} />
          <CheckboxField label="Push" checked={config.channels.push} onChange={(value) => updateChannel("push", value)} />
        </div>
      </FieldGroup>
      <FieldGroup title="Escalation Ladder">
        <div className="space-y-3">
          {config.escalation.map((rule, index) => (
            <div key={rule.level} className="grid gap-3 rounded-lg border border-slate-800 bg-slate-950/80 p-3 md:grid-cols-4">
              <TextInput label="Level" value={rule.level} onChange={(value) => updateEscalation(index, "level", value)} />
              <TextInput label="Target" value={rule.target} onChange={(value) => updateEscalation(index, "target", value)} />
              <TextInput
                label="Delay (minutes)"
                value={rule.delayMinutes}
                onChange={(value) => updateEscalation(index, "delayMinutes", value)}
              />
              <div className="flex items-end justify-end">
                <button
                  type="button"
                  onClick={() => removeEscalation(index)}
                  className="inline-flex items-center gap-1 rounded-md border border-rose-500/40 px-3 py-1 text-xs text-rose-200 hover:bg-rose-500/20"
                >
                  <X className="h-3 w-3" />
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
        <Button variant="secondary" icon={<Users className="h-4 w-4" />} onClick={addEscalation}>
          Add escalation
        </Button>
      </FieldGroup>
      <FieldGroup title="Quiet Hours">
        <CheckboxField
          label="Enable quiet hours"
          checked={config.quietHours.enabled}
          onChange={(value) =>
            mutate((draft) => {
              draft.quietHours.enabled = value;
            })
          }
        />
        <div className="grid gap-4 md:grid-cols-2">
          <TextInput
            label="Start"
            value={config.quietHours.start}
            onChange={(value) =>
              mutate((draft) => {
                draft.quietHours.start = value;
              })
            }
            type="time"
          />
          <TextInput
            label="End"
            value={config.quietHours.end}
            onChange={(value) =>
              mutate((draft) => {
                draft.quietHours.end = value;
              })
            }
            type="time"
          />
        </div>
        <CheckboxField
          label="Auto close alerts when resolved"
          checked={config.autoCloseOnResolution}
          onChange={(value) =>
            mutate((draft) => {
              draft.autoCloseOnResolution = value;
            })
          }
        />
      </FieldGroup>
    </div>
  );
}

function renderAiSection(
  config: AdminSettingConfigs["ai"],
  mutate: (updater: (next: AdminSettingConfigs["ai"]) => void) => void,
) {
  const toggleModelStatus = (index: number, status: "training" | "ready" | "error") => {
    mutate((draft) => {
      if (!draft.models[index]) return;
      draft.models[index] = { ...draft.models[index], status };
    });
  };

  return (
    <div className="space-y-4">
      <FieldGroup title="Assistant">
        <CheckboxField
          label="Enable AI assistant"
          checked={config.assistantEnabled}
          onChange={(value) =>
            mutate((draft) => {
              draft.assistantEnabled = value;
            })
          }
        />
        <CheckboxField
          label="Root cause learning"
          checked={config.rootCauseLearning}
          onChange={(value) =>
            mutate((draft) => {
              draft.rootCauseLearning = value;
            })
          }
        />
      </FieldGroup>
      <FieldGroup title="Predictive Maintenance">
        <NumberInput
          label="Alert threshold"
          value={config.predictiveMaintenanceThreshold}
          min={1}
          max={100}
          onChange={(value) =>
            mutate((draft) => {
              draft.predictiveMaintenanceThreshold = value;
            })
          }
        />
        <CheckboxField
          label="Auto-create work orders"
          checked={config.autoCreateWorkOrders}
          onChange={(value) =>
            mutate((draft) => {
              draft.autoCreateWorkOrders = value;
            })
          }
        />
      </FieldGroup>
      <FieldGroup title="Model Catalogue">
        <div className="space-y-3">
          {config.models.map((model, index) => (
            <div key={model.name} className="rounded-lg border border-slate-800 bg-slate-950/80 p-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-200">{model.name}</p>
                  <p className="text-xs text-slate-400">
                    Accuracy: {model.accuracy != null ? `${Math.round(model.accuracy * 100)}%` : "Pending calibration"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {(["training", "ready", "error"] as const).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => toggleModelStatus(index, status)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                        model.status === status
                          ? "border border-indigo-500 bg-indigo-500/20 text-indigo-200"
                          : "border border-slate-700 bg-slate-950/70 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </FieldGroup>
    </div>
  );
}

function renderIotSection(
  config: IoTGatewayConfig,
  mutate: (updater: (next: IoTGatewayConfig) => void) => void,
) {
  const addGateway = () => {
    mutate((draft) => {
      draft.gateways = [
        ...draft.gateways,
        {
          id: randomId("gw"),
          protocol: "MQTT",
          endpoint: "mqtt://localhost:1883",
          assets: [],
          status: "offline",
        },
      ];
    });
  };

  const updateGateway = (index: number, key: keyof GatewayMapping, value: string) => {
    mutate((draft) => {
      const gateway = draft.gateways[index];
      if (!gateway) return;
      if (key === "assets") {
        gateway.assets = value.split(",").map((item) => item.trim()).filter(Boolean);
        return;
      }
      if (key === "protocol") {
        gateway.protocol = value as GatewayMapping["protocol"];
        return;
      }
      if (key === "status") {
        gateway.status = value as GatewayMapping["status"];
        return;
      }
      gateway[key] = value as never;
    });
  };

  const removeGateway = (index: number) => {
    mutate((draft) => {
      draft.gateways = draft.gateways.filter((_, idx) => idx !== index);
    });
  };

  return (
    <div className="space-y-4">
      <FieldGroup title="Gateways">
        <div className="space-y-3">
          {config.gateways.map((gateway, index) => (
            <div key={gateway.id} className="rounded-xl border border-slate-800 bg-slate-950/80 p-4">
              <div className="grid gap-3 md:grid-cols-2">
                <SelectField
                  label="Protocol"
                  value={gateway.protocol}
                  onChange={(value) => updateGateway(index, "protocol", value)}
                  options={[
                    { label: "MQTT", value: "MQTT" },
                    { label: "OPC-UA", value: "OPC-UA" },
                    { label: "Modbus", value: "Modbus" },
                  ]}
                />
                <TextInput
                  label="Endpoint"
                  value={gateway.endpoint}
                  onChange={(value) => updateGateway(index, "endpoint", value)}
                  placeholder="mqtt://..."
                />
                <TextInput
                  label="Asset bindings"
                  value={gateway.assets.join(", ")}
                  onChange={(value) => updateGateway(index, "assets", value)}
                  placeholder="Asset IDs separated by commas"
                />
                <SelectField
                  label="Status"
                  value={gateway.status}
                  onChange={(value) => updateGateway(index, "status", value)}
                  options={[
                    { label: "Online", value: "online" },
                    { label: "Offline", value: "offline" },
                    { label: "Degraded", value: "degraded" },
                  ]}
                />
              </div>
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => removeGateway(index)}
                  className="flex items-center gap-1 rounded-md border border-rose-500/40 px-3 py-1 text-xs text-rose-200 hover:bg-rose-500/20"
                >
                  <X className="h-3 w-3" />
                  Remove gateway
                </button>
              </div>
            </div>
          ))}
        </div>
        <Button variant="secondary" icon={<SignalHigh className="h-4 w-4" />} onClick={addGateway}>
          Add gateway
        </Button>
      </FieldGroup>
      <FieldGroup title="Polling">
        <NumberInput
          label="Polling interval (seconds)"
          value={config.pollingIntervalSeconds}
          min={5}
          max={3600}
          onChange={(value) =>
            mutate((draft) => {
              draft.pollingIntervalSeconds = value;
            })
          }
        />
        <CheckboxField
          label="Allow unsecured connections"
          checked={config.allowUnsecuredConnections}
          onChange={(value) =>
            mutate((draft) => {
              draft.allowUnsecuredConnections = value;
            })
          }
        />
        <TextInput
          label="Default topic namespace"
          value={config.defaultTopicNamespace}
          onChange={(value) =>
            mutate((draft) => {
              draft.defaultTopicNamespace = value;
            })
          }
        />
      </FieldGroup>
    </div>
  );
}

function renderBackupSection(
  config: BackupConfig,
  mutate: (updater: (next: BackupConfig) => void) => void,
) {
  return (
    <div className="space-y-4">
      <FieldGroup title="Automation">
        <CheckboxField
          label="Enable automatic backups"
          checked={config.automatic.enabled}
          onChange={(value) =>
            mutate((draft) => {
              draft.automatic.enabled = value;
            })
          }
        />
        <SelectField
          label="Schedule"
          value={config.automatic.schedule}
          onChange={(value) =>
            mutate((draft) => {
              draft.automatic.schedule = value as BackupConfig["automatic"]["schedule"];
            })
          }
          options={[
            { label: "Hourly", value: "hourly" },
            { label: "Daily", value: "daily" },
            { label: "Weekly", value: "weekly" },
          ]}
        />
        <NumberInput
          label="Retention days"
          value={config.retentionDays}
          min={1}
          max={365}
          onChange={(value) =>
            mutate((draft) => {
              draft.retentionDays = value;
            })
          }
        />
      </FieldGroup>
      <FieldGroup title="History">
        <p className="text-xs text-slate-400">
          Last backup: {config.lastBackupAt ? new Date(config.lastBackupAt).toLocaleString() : "Not yet triggered"}
        </p>
        <p className="text-xs text-slate-400">
          Last restore: {config.lastRestore ? new Date(config.lastRestore.at).toLocaleString() : "Never"}
        </p>
        <div className="space-y-2">
          {config.snapshots.map((snapshot) => (
            <div key={snapshot.id} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-slate-300">
              <span>
                {new Date(snapshot.createdAt).toLocaleString()} • {snapshot.createdBy}
              </span>
              <span className="font-mono text-slate-400">{snapshot.id}</span>
            </div>
          ))}
          {config.snapshots.length === 0 && <p className="text-xs text-slate-500">No snapshots captured.</p>}
        </div>
      </FieldGroup>
    </div>
  );
}

function renderBrandingSection(
  config: BrandingConfig,
  mutate: (updater: (next: BrandingConfig) => void) => void,
) {
  const updateList = (value: string) => {
    mutate((draft) => {
      draft.whiteLabelDomains = value.split(/[,\n]/).map((item) => item.trim()).filter(Boolean);
    });
  };

  return (
    <div className="space-y-4">
      <FieldGroup title="Identity">
        <TextInput
          label="Logo URL"
          value={config.logoUrl ?? ""}
          onChange={(value) =>
            mutate((draft) => {
              draft.logoUrl = value || null;
            })
          }
        />
        <div className="grid gap-4 md:grid-cols-2">
          <TextInput
            label="Primary color"
            value={config.primaryColor}
            onChange={(value) =>
              mutate((draft) => {
                draft.primaryColor = value;
              })
            }
            type="color"
          />
          <TextInput
            label="Accent color"
            value={config.accentColor}
            onChange={(value) =>
              mutate((draft) => {
                draft.accentColor = value;
              })
            }
            type="color"
          />
        </div>
      </FieldGroup>
      <FieldGroup title="Locale">
        <TextInput
          label="Currency"
          value={config.currency}
          onChange={(value) =>
            mutate((draft) => {
              draft.currency = value;
            })
          }
        />
        <TextInput
          label="Time zone"
          value={config.timezone}
          onChange={(value) =>
            mutate((draft) => {
              draft.timezone = value;
            })
          }
        />
        <TextInput
          label="Language"
          value={config.language}
          onChange={(value) =>
            mutate((draft) => {
              draft.language = value;
            })
          }
        />
      </FieldGroup>
      <FieldGroup title="Support">
        <TextInput
          label="Support email"
          value={config.supportEmail}
          onChange={(value) =>
            mutate((draft) => {
              draft.supportEmail = value;
            })
          }
        />
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium uppercase tracking-wide text-slate-400">White-label domains</span>
          <textarea
            value={config.whiteLabelDomains.join("\n")}
            onChange={(event) => updateList(event.target.value)}
            rows={4}
            className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            placeholder="one.domain.com\nmaintenance.domain.com"
          />
        </label>
      </FieldGroup>
    </div>
  );
}
export default function AdminSettingModal({
  open,
  setting,
  apiKeys,
  onClose,
  onSubmit,
  onReset,
  onCreateApiKey,
  onRevokeApiKey,
  isSaving,
  isResetting,
  isCreatingKey,
  revokingKeyId,
}: AdminSettingModalProps) {
  const [localConfig, setLocalConfig] = useState<SectionConfig | null>(null);
  const [status, setStatus] = useState<AdminSettingStatus>("Pending");
  const [integrationForm, setIntegrationForm] = useState<CreateKeyPayload>({
    label: "",
    scopes: [],
    expiresAt: undefined,
  });
  const [generatedKey, setGeneratedKey] = useState<CreateApiKeyResponse | null>(null);

  useEffect(() => {
    if (setting) {
      setLocalConfig(deepClone(setting.config) as SectionConfig);
      setStatus(setting.status);
      setIntegrationForm({ label: "", scopes: [], expiresAt: undefined });
      setGeneratedKey(null);
    } else {
      setLocalConfig(null);
    }
  }, [setting, open]);

  const mutateConfig = <T extends SectionConfig>(mutator: (draft: T) => void) => {
    setLocalConfig((previous) => {
      if (!previous) return previous;
      const cloned = deepClone(previous) as SectionConfig;
      mutator(cloned as T);
      return cloned;
    });
  };

  const handleSave = async () => {
    if (!setting || !localConfig) return;
    try {
      const payload: AdminSettingsUpdatePayload = {
        status,
        config: localConfig,
      };
      const updated = await onSubmit(setting.section, payload);
      if (updated) {
        setLocalConfig(deepClone(updated.config) as SectionConfig);
        setStatus(updated.status);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save setting");
    }
  };

  const handleReset = async () => {
    if (!setting) return;
    try {
      const updated = await onReset(setting.section);
      if (updated) {
        setLocalConfig(deepClone(updated.config) as SectionConfig);
        setStatus(updated.status);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to reset setting");
    }
  };

  const isDirty = useMemo(() => {
    if (!setting) return false;
    const source = JSON.stringify(setting.config);
    const draft = JSON.stringify(localConfig ?? {});
    return source !== draft || setting.status !== status;
  }, [setting, localConfig, status]);

  const sectionContent = useMemo(() => {
    if (!setting || !localConfig) {
      return <p className="text-sm text-slate-400">Select a setting to configure.</p>;
    }

    switch (setting.section) {
      case "site":
        return renderSiteSection(
          localConfig as SiteConfiguration,
          (updater) => mutateConfig<SiteConfiguration>((draft) => updater(draft)),
        );
      case "roles":
        return renderRolesSection(
          localConfig as RolePermissionsConfig,
          (updater) => mutateConfig<RolePermissionsConfig>((draft) => updater(draft)),
        );
      case "auth":
        return renderAuthSection(
          localConfig as AuthenticationConfig,
          (updater) => mutateConfig<AuthenticationConfig>((draft) => updater(draft)),
        );
      case "audit":
        return renderAuditSection(
          localConfig as AdminSettingConfigs["audit"],
          (updater) => mutateConfig<AdminSettingConfigs["audit"]>((draft) => updater(draft)),
        );
      case "integrations":
        return renderIntegrationsSection(
          localConfig as IntegrationConfig,
          apiKeys,
          integrationForm,
          (updater) => setIntegrationForm((prev) => updater(prev)),
          generatedKey,
          setGeneratedKey,
          (updater) => mutateConfig<IntegrationConfig>((draft) => updater(draft)),
          onCreateApiKey,
          onRevokeApiKey,
          isCreatingKey,
          revokingKeyId,
        );
      case "notifications":
        return renderNotificationsSection(
          localConfig as NotificationRulesConfig,
          (updater) => mutateConfig<NotificationRulesConfig>((draft) => updater(draft)),
        );
      case "ai":
        return renderAiSection(
          localConfig as AdminSettingConfigs["ai"],
          (updater) => mutateConfig<AdminSettingConfigs["ai"]>((draft) => updater(draft)),
        );
      case "iot":
        return renderIotSection(
          localConfig as IoTGatewayConfig,
          (updater) => mutateConfig<IoTGatewayConfig>((draft) => updater(draft)),
        );
      case "backup":
        return renderBackupSection(
          localConfig as BackupConfig,
          (updater) => mutateConfig<BackupConfig>((draft) => updater(draft)),
        );
      case "branding":
        return renderBrandingSection(
          localConfig as BrandingConfig,
          (updater) => mutateConfig<BrandingConfig>((draft) => updater(draft)),
        );
      default:
        return null;
    }
  }, [
    setting,
    localConfig,
    apiKeys,
    integrationForm,
    generatedKey,
    onCreateApiKey,
    onRevokeApiKey,
    isCreatingKey,
    revokingKeyId,
  ]);

  const statusInfo = statusTone[status];

  const updatedAt = setting?.updatedAt ? new Date(setting.updatedAt).toLocaleString() : null;

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-h-[90vh] w-full max-w-5xl overflow-hidden border-slate-800 bg-slate-950 text-slate-200">
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-3 text-indigo-300">
            {setting ? iconBySection[setting.section] : <Zap className="h-5 w-5" />}
            <div>
              <DialogTitle className="text-2xl font-semibold text-slate-50">
                {setting?.title ?? "Admin Setting"}
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-400">
                {setting?.description ?? "Manage your enterprise CMMS configuration."}
              </DialogDescription>
            </div>
          </div>
          {setting && (
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
              <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${statusInfo.chip}`}>
                <span className={statusInfo.badge}>●</span>
                {statusInfo.label}
              </span>
              <span className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-slate-500" />
                Last updated {updatedAt ? updatedAt : "—"}
              </span>
              {setting.updatedByName && (
                <span className="flex items-center gap-2">
                  <Users className="h-3.5 w-3.5 text-slate-500" />
                  {setting.updatedByName}
                </span>
              )}
            </div>
          )}
        </DialogHeader>

        {setting && (
          <div className="mb-4 flex flex-wrap items-center gap-4 rounded-lg border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-400">Status</span>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as AdminSettingStatus)}
                className="rounded-md border border-slate-700 bg-slate-950 px-3 py-1 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              >
                {statusOptions.map((option) => (
                  <option key={option} value={option} className="bg-slate-900 text-slate-200">
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <RefreshCw className="h-4 w-4" />
              <button
                type="button"
                onClick={handleReset}
                disabled={!setting || isResetting}
                className="rounded-md border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-indigo-500 hover:text-indigo-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Reset to defaults
              </button>
            </div>
          </div>
        )}

        <div className="custom-scrollbar max-h-[55vh] space-y-4 overflow-y-auto pr-2 text-sm">
          {sectionContent}
        </div>

        <DialogFooter className="mt-6 flex flex-col gap-3 border-t border-slate-800 pt-4 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <InfoBadge />
            Changes are tracked in the global audit log for compliance visibility.
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" onClick={onClose} icon={<X className="h-4 w-4" />}>
              Cancel
            </Button>
            <Button
              variant="primary"
              icon={<Save className="h-4 w-4" />}
              onClick={handleSave}
              disabled={!isDirty || isSaving}
              loading={isSaving}
            >
              Save changes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InfoBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900/80 px-2 py-1 text-xs text-slate-400">
      <ShieldCheck className="h-3 w-3" />
      Audit enforced
    </span>
  );
}
