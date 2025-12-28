/*
 * SPDX-License-Identifier: MIT
 */

import type { Types } from 'mongoose';

import type { PermissionChangeActor } from '../../../models/PermissionChangeLog';
import { recordPermissionChange } from '../../../services/permissionAuditService';
import { writeAuditLog, type AuditActor } from '../../../utils/audit';
import { toEntityId } from '../../../utils/ids';

export interface AuthenticationAuditInput {
  user?: {
    _id?: Types.ObjectId | string | null;
    id?: Types.ObjectId | string | null;
    email?: string | null;
    name?: string | null;
    tenantId?: Types.ObjectId | string | null;
    siteId?: Types.ObjectId | string | null;
  } | null;
  action: string;
  tenantId?: string;
  details?: Record<string, unknown>;
}

export const logAuthenticationEvent = async ({
  user,
  action,
  tenantId,
  details,
}: AuthenticationAuditInput): Promise<void> => {
  const resolvedTenantId = tenantId ?? toEntityId(user?.tenantId) ?? undefined;
  if (!resolvedTenantId) return;

  const actor: AuditActor | undefined = user
    ? {
        id: user._id ?? user.id ?? undefined,
        email: user.email ?? undefined,
        name: user.name ?? undefined,
      }
    : undefined;

  await writeAuditLog({
    tenantId: resolvedTenantId,
    siteId: user?.siteId ?? undefined,
    userId: user?._id ?? user?.id ?? undefined,
    ...(actor ? { actor } : {}),
    action,
    entityType: 'authentication',
    entityId: toEntityId(user?._id ?? user?.id) ?? resolvedTenantId,
    after: details,
  });
};

export interface PermissionChangeAuditInput {
  tenantId: Types.ObjectId;
  siteId?: Types.ObjectId | null;
  departmentId?: Types.ObjectId | null;
  roleId?: Types.ObjectId | null;
  roleName?: string | null;
  before?: string[] | null;
  after?: string[] | null;
  actor?: PermissionChangeActor | null;
}

export const logPermissionChange = async (input: PermissionChangeAuditInput): Promise<void> => {
  await recordPermissionChange(input);
  await writeAuditLog({
    tenantId: input.tenantId,
    siteId: input.siteId ?? undefined,
    userId: input.actor?.id ?? undefined,
    actor: input.actor
      ? {
          id: input.actor.id ?? undefined,
          email: input.actor.email ?? undefined,
          name: input.actor.name ?? undefined,
        }
      : undefined,
    action: 'permission_change',
    entityType: 'role',
    entityId: input.roleId ?? undefined,
    entityLabel: input.roleName ?? undefined,
    before: input.before ? { permissions: input.before } : undefined,
    after: input.after ? { permissions: input.after } : undefined,
  });
};
