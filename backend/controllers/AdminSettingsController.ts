/*
 * SPDX-License-Identifier: MIT
 */

import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import speakeasy from 'speakeasy';
import { Types } from 'mongoose';
import { z } from 'zod';

import AdminSetting from '../models/AdminSetting';
import ApiKey from '../models/ApiKey';
import AuditLog from '../models/AuditLog';
import sendResponse from '../utils/sendResponse';
import type { AuthedRequestHandler } from '../types/http';
import type {
  AdminSettingSection,
  AdminSettingsPayload,
  AdminSettingDetail,
  ApiKeySummary,
  AdminSettingStatus,
} from '@shared/admin';
import { ADMIN_SETTING_TEMPLATES, getTemplateForSection } from '@shared/admin';
import type { AuditContext } from '../middleware/auditTrail';

const statusSchema = z.enum(["Active", "In Progress", "Pending", "Disabled", "Completed"]);

const updatePayloadSchema = z.object({
  status: statusSchema.optional(),
  reset: z.boolean().optional(),
  config: z.unknown().optional(),
});

const apiKeySchema = z.object({
  label: z.string().min(3),
  scopes: z.array(z.string()).min(1),
  expiresAt: z.string().datetime().optional(),
});

const ensureObjectId = (value?: string): Types.ObjectId | undefined => {
  if (!value) return undefined;
  if (!Types.ObjectId.isValid(value)) return undefined;
  return new Types.ObjectId(value);
};

type AnyRecord = Record<string, unknown>;

type AdminSettingSnapshot = {
  config?: AnyRecord;
  status?: string;
  updatedAt?: Date;
  updatedBy?: Types.ObjectId | string;
  updatedByName?: string;
  metadata?: AnyRecord | null;
};

const mergeConfig = <T>(base: T, override: unknown): T => {
  if (override == null || typeof override !== 'object') {
    return base;
  }
  if (Array.isArray(base)) {
    if (Array.isArray(override)) {
      return override as unknown as T;
    }
    return base;
  }
  const result: AnyRecord = Array.isArray(base) ? [...(base as unknown[])] : { ...((base as AnyRecord) ?? {}) };
  const source = override as AnyRecord;
  Object.entries(source).forEach(([key, value]) => {
    if (value === undefined) return;
    const current = (result as AnyRecord)[key];
    if (Array.isArray(value)) {
      (result as AnyRecord)[key] = value;
    } else if (value && typeof value === 'object' && current && typeof current === 'object' && !Array.isArray(current)) {
      (result as AnyRecord)[key] = mergeConfig(current, value);
    } else {
      (result as AnyRecord)[key] = value;
    }
  });
  return result as T;
};

const maskSensitiveConfig = (section: AdminSettingSection, config: AnyRecord, metadata?: AnyRecord | null) => {
  if (section === 'auth') {
    const mfaSecretPresent = Boolean(metadata?.mfaSecret);
    const authConfig = config as AnyRecord;
    const mfa = (authConfig.mfa as AnyRecord) ?? {};
    mfa.secretMasked = mfaSecretPresent ? '••••••••' : null;
    authConfig.mfa = mfa;
  }
};

const buildSettingDetail = (
  section: AdminSettingSection,
  document: AdminSettingSnapshot | null,
): AdminSettingDetail => {
  const template = getTemplateForSection(section);
  if (!template) {
    throw new Error(`Unknown admin setting section: ${section}`);
  }
  const storedConfig = document?.config ?? {};
  const mergedConfig = mergeConfig(template.defaultConfig, storedConfig);
  const metadata = (document?.metadata as AnyRecord | null) ?? null;
  maskSensitiveConfig(section, mergedConfig as AnyRecord, metadata ?? undefined);

  return {
    section,
    title: template.title,
    description: template.description,
    status: (document?.status as AdminSettingStatus | undefined) ?? template.defaultStatus,
    updatedAt: document?.updatedAt instanceof Date ? document.updatedAt.toISOString() : document?.updatedAt,
    updatedBy: document?.updatedBy ? document.updatedBy.toString() : undefined,
    updatedByName: document?.updatedByName,
    config: mergedConfig,
    metadata: metadata ?? undefined,
  } as AdminSettingDetail;
};

const sanitizeSettingsPayload = async (tenantId: string): Promise<AdminSettingsPayload> => {
  const tenantObjectId = ensureObjectId(tenantId);
  const settings = await AdminSetting.find({ tenantId: tenantObjectId }).lean().exec();
  const settingsBySection = new Map<AdminSettingSection, AdminSettingSnapshot>();
  settings.forEach((entry) => {
    settingsBySection.set(entry.section as AdminSettingSection, entry as unknown as AdminSettingSnapshot);
  });

  const sections = ADMIN_SETTING_TEMPLATES.map((template) =>
    buildSettingDetail(template.section, settingsBySection.get(template.section) ?? null),
  );

  const keyQuery: AnyRecord = { tenantId: tenantObjectId, status: { $ne: 'deleted' } };
  const keys = await ApiKey.find(keyQuery)
    .sort({ createdAt: -1 })
    .lean()
    .exec();

  const apiKeys: ApiKeySummary[] = keys.map((doc) => ({
    id: doc._id.toString(),
    label: doc.label,
    lastFour: doc.lastFour,
    scopes: doc.scopes,
    status: (doc.status as 'active' | 'revoked') ?? 'active',
    createdAt: doc.createdAt.toISOString(),
    createdBy: doc.createdBy ? doc.createdBy.toString() : undefined,
    createdByName: doc.createdByName,
    expiresAt: doc.expiresAt ? doc.expiresAt.toISOString() : undefined,
  }));

  return { sections, apiKeys };
};

export const getAdminSettings: AuthedRequestHandler = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant context missing', 400);
      return;
    }

    const payload = await sanitizeSettingsPayload(tenantId);
    sendResponse(res, payload);
  } catch (err) {
    next(err);
  }
};

export const updateAdminSetting: AuthedRequestHandler<{ section: string }> = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant context missing', 400);
      return;
    }

    const sectionParam = req.params.section as AdminSettingSection;
    const template = getTemplateForSection(sectionParam);
    if (!template) {
      sendResponse(res, null, 'Unknown settings section', 404);
      return;
    }

    const parsed = updatePayloadSchema.parse(req.body ?? {});
    const tenantObjectId = ensureObjectId(tenantId) ?? tenantId;

    const current = await AdminSetting.findOne({ tenantId: tenantObjectId, section: sectionParam }).lean();

    let nextConfig = template.defaultConfig;
    let nextStatus: AdminSettingStatus = template.defaultStatus;
    let metadata: Record<string, unknown> | undefined = current?.metadata as AnyRecord | undefined;

    if (!parsed.reset) {
      nextConfig = mergeConfig(template.defaultConfig, current?.config ?? {});
      if (parsed.config) {
        nextConfig = mergeConfig(nextConfig, parsed.config);
      }
      nextStatus = (parsed.status ?? (current?.status as AdminSettingStatus | undefined) ?? template.defaultStatus) as AdminSettingStatus;
    } else {
      nextStatus = template.defaultStatus;
      metadata = undefined;
    }

    if (sectionParam === 'auth') {
      const authConfig = nextConfig as AnyRecord;
      const mfa = (authConfig.mfa as AnyRecord) ?? {};
      if (mfa.enabled && Array.isArray(mfa.methods) && mfa.methods.includes('totp')) {
        if (!metadata?.mfaSecret) {
          const secret = speakeasy.generateSecret({ length: 20, name: mfa.issuer ?? 'WorkPro3' });
          metadata = { ...(metadata ?? {}), mfaSecret: secret.base32 };
        }
      } else if (metadata?.mfaSecret) {
        metadata = { ...metadata };
        delete metadata.mfaSecret;
      }
      authConfig.mfa = mfa;
    }

    const setPayload: AnyRecord = {
      config: nextConfig,
      status: nextStatus,
      updatedBy: req.user?._id ?? req.user?.id,
      updatedByName: req.user?.name,
    };
    const updateOps: AnyRecord = { $set: setPayload };
    if (metadata !== undefined) {
      setPayload.metadata = metadata;
    } else {
      updateOps.$unset = { metadata: '' };
    }

    const updated = await AdminSetting.findOneAndUpdate(
      { tenantId: tenantObjectId, section: sectionParam },
      updateOps,
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    const auditContext = (res.locals as { auditContext?: AuditContext }).auditContext;
    if (auditContext) {
      auditContext.entityId = sectionParam;
      auditContext.details = {
        status: nextStatus,
        updatedBy: req.user?.name ?? req.user?.id,
      };
      auditContext.after = {
        config: nextConfig,
      } as Record<string, unknown>;
      if (current) {
        auditContext.before = {
          config: current.config,
        } as Record<string, unknown>;
      }
    }

    const detail = buildSettingDetail(sectionParam, updated);
    sendResponse(res, detail, 'Setting updated');
  } catch (err) {
    next(err);
  }
};

export const createIntegrationKey: AuthedRequestHandler = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant context missing', 400);
      return;
    }
    const { label, scopes, expiresAt } = apiKeySchema.parse(req.body ?? {});

    const payload = await sanitizeSettingsPayload(tenantId);
    const template = payload.sections.find((section) => section.section === 'integrations');
    const validScopes = new Set((template?.config as { scopesCatalog: string[] }).scopesCatalog ?? []);
    const sanitizedScopes = Array.from(
      new Set(scopes.filter((scope) => validScopes.size === 0 || validScopes.has(scope))),
    );
    if (!sanitizedScopes.length) {
      sendResponse(res, null, 'No valid scopes provided', 400);
      return;
    }

    const rawKey = `wkp_${randomUUID().replace(/-/g, '')}`;
    const keyHash = await bcrypt.hash(rawKey, 12);
    const tenantObjectId = ensureObjectId(tenantId) ?? tenantId;
    const expires = expiresAt ? new Date(expiresAt) : undefined;

    const created = await ApiKey.create({
      tenantId: tenantObjectId,
      label,
      keyHash,
      scopes: sanitizedScopes,
      createdBy: req.user?._id ?? req.user?.id,
      createdByName: req.user?.name,
      lastFour: rawKey.slice(-4),
      expiresAt: expires,
    });

    const auditContext = (res.locals as { auditContext?: AuditContext }).auditContext;
    if (auditContext) {
      auditContext.entityId = created._id.toString();
      auditContext.details = {
        label,
        scopes: sanitizedScopes,
        expiresAt: expires?.toISOString(),
      };
    }

    sendResponse(res, { id: created._id.toString(), key: rawKey, lastFour: created.lastFour }, 'API key created', 201);
  } catch (err) {
    next(err);
  }
};

export const revokeIntegrationKey: AuthedRequestHandler<{ id: string }> = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant context missing', 400);
      return;
    }
    const keyId = req.params.id;
    const tenantObjectId = ensureObjectId(tenantId) ?? tenantId;

    const updated = await ApiKey.findOneAndUpdate(
      { _id: keyId, tenantId: tenantObjectId },
      { $set: { status: 'revoked' } },
      { new: true },
    );

    if (!updated) {
      sendResponse(res, null, 'API key not found', 404);
      return;
    }

    const auditContext = (res.locals as { auditContext?: AuditContext }).auditContext;
    if (auditContext) {
      auditContext.entityId = updated._id.toString();
      auditContext.details = {
        label: updated.label,
        status: updated.status,
      };
    }

    sendResponse(res, { id: updated._id.toString() }, 'API key revoked');
  } catch (err) {
    next(err);
  }
};

export const getAuditLog: AuthedRequestHandler<ParamsDictionary, unknown, unknown, ParsedQs & { limit?: string }> = async (
  req,
  res,
  next,
) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant context missing', 400);
      return;
    }
    const limitRaw = req.query.limit ?? '50';
    const limit = Math.min(Math.max(parseInt(String(limitRaw), 10) || 50, 1), 200);
    const tenantObjectId = ensureObjectId(tenantId) ?? tenantId;

    const modules = new Set([
      'Admin Settings',
      'Integrations',
      'Backup',
      'AI Automation',
      'IoT Gateways',
      'Notifications',
    ]);

    const logs = await AuditLog
      .find({ tenantId: tenantObjectId, module: { $in: Array.from(modules) } })
      .sort({ ts: -1 })
      .limit(limit)
      .lean()
      .exec();

    const data = logs.map((log) => ({
      id: log._id.toString(),
      module: (log.module as string | undefined) ?? log.entityType,
      action: log.action,
      timestamp: log.ts instanceof Date ? log.ts.toISOString() : new Date(log.ts).toISOString(),
      user: log.userId ? log.userId.toString() : undefined,
      details: log.details ?? undefined,
    }));

    sendResponse(res, data);
  } catch (err) {
    next(err);
  }
};

export const triggerBackup: AuthedRequestHandler = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant context missing', 400);
      return;
    }

    const tenantObjectId = ensureObjectId(tenantId) ?? tenantId;
    const now = new Date();

    const updated = await AdminSetting.findOneAndUpdate(
      { tenantId: tenantObjectId, section: 'backup' },
      {
        $set: {
          'config.lastBackupAt': now.toISOString(),
          updatedBy: req.user?._id ?? req.user?.id,
          updatedByName: req.user?.name,
        },
        $push: {
          'config.snapshots': {
            id: `snapshot_${now.getTime()}`,
            createdAt: now.toISOString(),
            createdBy: req.user?.name ?? 'System',
          },
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    const auditContext = (res.locals as { auditContext?: AuditContext }).auditContext;
    if (auditContext) {
      auditContext.entityId = 'backup';
      auditContext.details = {
        triggeredAt: now.toISOString(),
        snapshots: updated?.config?.snapshots?.length,
      } as Record<string, unknown>;
    }

    sendResponse(res, { triggeredAt: now.toISOString() }, 'Backup started');
  } catch (err) {
    next(err);
  }
};

export const getIoTGateways: AuthedRequestHandler = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant context missing', 400);
      return;
    }

    const tenantObjectId = ensureObjectId(tenantId) ?? tenantId;
    const setting = await AdminSetting.findOne({ tenantId: tenantObjectId, section: 'iot' }).lean();
    const detail = buildSettingDetail('iot', setting ?? null);
    sendResponse(res, detail.config);
  } catch (err) {
    next(err);
  }
};

export const trainAiModels: AuthedRequestHandler = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant context missing', 400);
      return;
    }

    const tenantObjectId = ensureObjectId(tenantId) ?? tenantId;
    const existing = await AdminSetting.findOne({ tenantId: tenantObjectId, section: 'ai' }).lean();
    const detail = buildSettingDetail('ai', existing ?? null);
    const now = new Date().toISOString();
    const nextConfig = {
      ...detail.config,
      lastTrainingRun: now,
      models: detail.config.models.map((model) => ({ ...model, status: 'training' as const })),
    };

    await AdminSetting.findOneAndUpdate(
      { tenantId: tenantObjectId, section: 'ai' },
      {
        $set: {
          config: nextConfig,
          updatedBy: req.user?._id ?? req.user?.id,
          updatedByName: req.user?.name,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    const auditContext = (res.locals as { auditContext?: AuditContext }).auditContext;
    if (auditContext) {
      auditContext.entityId = 'ai';
      auditContext.details = {
        triggeredBy: req.user?.name ?? req.user?.id,
        lastTrainingRun: now,
      };
    }

    sendResponse(res, { status: 'training', lastTrainingRun: now }, 'AI training started');
  } catch (err) {
    next(err);
  }
};

export const getAiStatus: AuthedRequestHandler = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant context missing', 400);
      return;
    }

    const tenantObjectId = ensureObjectId(tenantId) ?? tenantId;
    const setting = await AdminSetting.findOne({ tenantId: tenantObjectId, section: 'ai' }).lean();
    const detail = buildSettingDetail('ai', setting ?? null);
    sendResponse(res, {
      assistantEnabled: detail.config.assistantEnabled,
      models: detail.config.models,
      lastTrainingRun: detail.config.lastTrainingRun,
      predictiveMaintenanceThreshold: detail.config.predictiveMaintenanceThreshold,
    });
  } catch (err) {
    next(err);
  }
};

