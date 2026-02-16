/*
 * SPDX-License-Identifier: MIT
 */

import { Types, type FlattenMaps } from 'mongoose';

import TenantDataPolicy, { type TenantDataPolicyDocument } from '../../../models/TenantDataPolicy';
import AuditLog from '../../../models/AuditLog';
import { writeAuditLog, type AuditActor } from '../../../utils/audit';
import { toObjectId, type EntityIdLike } from '../../../utils/ids';
import { getSecurityPolicy } from '../../../config/securityPolicies';

export class PartitionViolationError extends Error {
  status = 403;

  constructor(message: string) {
    super(message);
    this.name = 'PartitionViolationError';
  }
}

export interface TenantAccessContext {
  tenantId: EntityIdLike;
  siteId?: EntityIdLike;
  allowGlobalSearch?: boolean;
}

export interface PartitionDecision {
  tenantId: Types.ObjectId;
  siteId?: Types.ObjectId;
  rollup: boolean;
}

export interface SearchScope {
  tenantIds: Types.ObjectId[];
  allowGlobal: boolean;
  rollup: boolean;
}

export interface ResidencyAndRetentionInput {
  residencyRegion: string;
  retentionDays?: number;
  allowGlobalSearch?: boolean;
  allowCrossSiteRollups?: boolean;
  updatedBy?: EntityIdLike;
}

interface PolicySnapshot {
  residency: { region: string };
  retentionDays: { audit: number; data: number };
  allowGlobalSearch: boolean;
  allowCrossSiteRollups: boolean;
}

const DEFAULT_RESIDENCY = 'us-central';
const DEFAULT_DATA_RETENTION_DAYS = 365;

const toObjectIdOrThrow = (value: EntityIdLike | undefined, message: string): Types.ObjectId => {
  const asObjectId = toObjectId(value);
  if (!asObjectId) {
    throw new PartitionViolationError(message);
  }
  return asObjectId;
};

type TenantPolicyLean = FlattenMaps<TenantDataPolicyDocument> & { _id: Types.ObjectId };

const toPolicySnapshot = (policy: TenantPolicyLean | TenantDataPolicyDocument | null): PolicySnapshot => {
  if (!policy) {
    return {
      residency: { region: DEFAULT_RESIDENCY },
      retentionDays: { audit: getSecurityPolicy().audit.retentionDays, data: DEFAULT_DATA_RETENTION_DAYS },
      allowGlobalSearch: false,
      allowCrossSiteRollups: false,
    };
  }

  return {
    residency: { region: policy.residency?.region ?? DEFAULT_RESIDENCY },
    retentionDays: {
      audit: policy.retentionDays?.audit ?? getSecurityPolicy().audit.retentionDays,
      data: policy.retentionDays?.data ?? DEFAULT_DATA_RETENTION_DAYS,
    },
    allowGlobalSearch: policy.allowGlobalSearch ?? false,
    allowCrossSiteRollups: policy.allowCrossSiteRollups ?? false,
  };
};

export const getTenantDataPolicy = async (tenantId: EntityIdLike): Promise<PolicySnapshot> => {
  const tenantObjectId = toObjectId(tenantId);
  if (!tenantObjectId) {
    throw new PartitionViolationError('Tenant context is required');
  }
  const doc = await TenantDataPolicy.findOne({ tenantId: tenantObjectId }).lean();
  return toPolicySnapshot(doc);
};

export const updateTenantResidencyAndRetention = async (
  tenantId: EntityIdLike,
  input: ResidencyAndRetentionInput,
): Promise<PolicySnapshot> => {
  const tenantObjectId = toObjectIdOrThrow(tenantId, 'Tenant context is required');
  const retentionDays = input.retentionDays && input.retentionDays > 0 ? input.retentionDays : undefined;

  const updated = await TenantDataPolicy.findOneAndUpdate(
    { tenantId: tenantObjectId },
    {
      tenantId: tenantObjectId,
      residency: { region: input.residencyRegion || DEFAULT_RESIDENCY },
      retentionDays: {
        audit: retentionDays ?? getSecurityPolicy().audit.retentionDays,
        data: retentionDays ?? DEFAULT_DATA_RETENTION_DAYS,
      },
      allowGlobalSearch: input.allowGlobalSearch ?? false,
      allowCrossSiteRollups: input.allowCrossSiteRollups ?? false,
      updatedBy: toObjectId(input.updatedBy) ?? undefined,
      updatedAt: new Date(),
    },
    { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true },
  );

  return toPolicySnapshot(updated);
};

export const enforcePartitionBoundary = async (
  ctx: TenantAccessContext,
  request: { tenantId?: EntityIdLike; siteId?: EntityIdLike; rollup?: boolean },
): Promise<PartitionDecision> => {
  const tenantObjectId = toObjectIdOrThrow(ctx.tenantId, 'Tenant context is required');
  const requestedTenant = toObjectId(request.tenantId ?? ctx.tenantId);
  if (!requestedTenant || !requestedTenant.equals(tenantObjectId)) {
    throw new PartitionViolationError('Cross-tenant access is not permitted.');
  }

  const policy = await getTenantDataPolicy(tenantObjectId);
  const requestedSite = toObjectId(request.siteId ?? ctx.siteId);
  const rollupRequested = request.rollup ?? false;

  if (rollupRequested && !policy.allowCrossSiteRollups) {
    throw new PartitionViolationError('Cross-site rollups are disabled for this tenant.');
  }

  if (!rollupRequested && ctx.siteId && requestedSite && !toObjectId(ctx.siteId)?.equals(requestedSite)) {
    throw new PartitionViolationError('Site access is limited to the current tenant site.');
  }

  return {
    tenantId: tenantObjectId,
    siteId: rollupRequested ? undefined : requestedSite ?? undefined,
    rollup: rollupRequested,
  };
};

export const buildSearchScope = async (
  ctx: TenantAccessContext,
  allowedTenantIds?: EntityIdLike[],
): Promise<SearchScope> => {
  const tenantObjectId = toObjectIdOrThrow(ctx.tenantId, 'Tenant context is required');
  const policy = await getTenantDataPolicy(tenantObjectId);

  const normalizedAllowedTenants = (allowedTenantIds ?? [])
    .map((id) => toObjectId(id))
    .filter((id): id is Types.ObjectId => Boolean(id));

  const allowGlobal = Boolean(ctx.allowGlobalSearch && policy.allowGlobalSearch && normalizedAllowedTenants.length > 0);

  return {
    tenantIds: allowGlobal ? normalizedAllowedTenants : [tenantObjectId],
    allowGlobal,
    rollup: policy.allowCrossSiteRollups,
  };
};

const computeExpiration = (retentionDays: number): Date => {
  const days = retentionDays > 0 ? retentionDays : getSecurityPolicy().audit.retentionDays;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
};

export const auditAuthenticationEvent = async (params: {
  tenantId: EntityIdLike;
  siteId?: EntityIdLike;
  userId?: EntityIdLike;
  actor?: AuditActor;
  outcome: 'success' | 'failure';
  detail?: string;
}): Promise<void> => {
  const policy = await getTenantDataPolicy(params.tenantId);
  await writeAuditLog({
    tenantId: params.tenantId,
    siteId: params.siteId,
    userId: params.userId,
    actor: params.actor,
    action: `auth.${params.outcome}`,
    entityType: 'authentication',
    entityId: params.userId,
    after: { outcome: params.outcome, detail: params.detail ?? 'authentication event' },
    expiresAt: computeExpiration(policy.retentionDays.audit),
  });
};

export const auditConfigurationChange = async (params: {
  tenantId: EntityIdLike;
  siteId?: EntityIdLike;
  userId?: EntityIdLike;
  actor?: AuditActor;
  entityType: string;
  entityId?: EntityIdLike;
  before?: unknown;
  after?: unknown;
}): Promise<void> => {
  const policy = await getTenantDataPolicy(params.tenantId);
  await writeAuditLog({
    tenantId: params.tenantId,
    siteId: params.siteId,
    userId: params.userId,
    actor: params.actor,
    action: 'config.change',
    entityType: params.entityType,
    entityId: params.entityId,
    before: params.before,
    after: params.after,
    expiresAt: computeExpiration(policy.retentionDays.audit),
  });
};

export const auditDataAccessEvent = async (params: {
  tenantId: EntityIdLike;
  siteId?: EntityIdLike;
  userId?: EntityIdLike;
  actor?: AuditActor;
  entityType: string;
  entityId?: EntityIdLike;
  description?: string;
}): Promise<void> => {
  const policy = await getTenantDataPolicy(params.tenantId);
  await writeAuditLog({
    tenantId: params.tenantId,
    siteId: params.siteId,
    userId: params.userId,
    actor: params.actor,
    action: 'data.access',
    entityType: params.entityType,
    entityId: params.entityId,
    after: { description: params.description ?? 'data access' },
    expiresAt: computeExpiration(policy.retentionDays.audit),
  });
};

export const listAuditLogsForAdmin = async (
  tenantId: EntityIdLike,
  options: { limit?: number; entityType?: string } = {},
) => {
  const tenantObjectId = toObjectIdOrThrow(tenantId, 'Tenant context is required');
  const filter: Record<string, unknown> = { tenantId: tenantObjectId };
  if (options.entityType) {
    filter.entityType = options.entityType;
  }

  return AuditLog.find(filter)
    .sort({ ts: -1 })
    .limit(Math.min(options.limit ?? 50, 200))
    .lean();
};
