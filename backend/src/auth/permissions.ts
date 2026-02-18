/*
 * SPDX-License-Identifier: MIT
 */

import type { RequestHandler } from 'express';

import type { AuthedRequest, AuthedRequestWithUser } from '../../types/http';
import {
  formatPermission,
  type Permission,
  type PermissionAction,
  type PermissionCategory,
} from '../../shared/permissions';
import { ensurePermissionList, hasPermission, resolveUserPermissions } from '../../services/permissionService';

const toPermissionKey = <C extends PermissionCategory>(
  scopeOrPermission: Permission | C,
  action?: PermissionAction<C>,
): Permission => {
  if (action) {
    return formatPermission(String(scopeOrPermission), action);
  }
  return String(scopeOrPermission) as Permission;
};

const hasAuthedUser = (req: AuthedRequest): req is AuthedRequestWithUser => Boolean(req.user);

const resolvePermissionsForRequest = async (
  req: AuthedRequestWithUser,
): Promise<{ permissions: Permission[]; roles: string[] }> => {
  const { user } = req;
  const userId = user.id;
  if (!userId) {
    throw Object.assign(new Error('Unauthorized'), { status: 401 });
  }

  const existing = ensurePermissionList(user.permissions);
  if (existing.length > 0) {
    return { permissions: existing, roles: user.roles ?? [] };
  }

  const tenantId = req.tenantId ?? user.tenantId;
  const siteId = req.siteId ?? user.siteId;
  const departmentId = req.departmentId;
  const fallbackRoles = user.roles;

  const result = await resolveUserPermissions({
    userId,
    ...(tenantId ? { tenantId } : {}),
    ...(siteId ? { siteId } : {}),
    ...(departmentId ? { departmentId } : {}),
    ...(fallbackRoles ? { fallbackRoles } : {}),
  });

  req.user.permissions = result.permissions;
  req.user.roles = result.roles;
  req.permissions = result.permissions;
  return result;
};

export function requirePermission(permission: Permission): RequestHandler;
export function requirePermission<C extends PermissionCategory>(
  scope: C,
  action: PermissionAction<C>,
): RequestHandler;
export function requirePermission<C extends PermissionCategory>(
  scopeOrPermission: Permission | C,
  action?: PermissionAction<C>,
): RequestHandler {
  return async (req: AuthedRequest, res, next): Promise<void> => {
    try {
      if (!hasAuthedUser(req)) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }
      const permission = toPermissionKey(scopeOrPermission, action);
      const { permissions } = await resolvePermissionsForRequest(req);

      if (!hasPermission(permissions, permission)) {
        res.status(403).json({ message: 'Forbidden' });
        return;
      }

      next();
    } catch (error) {
      if ((error as { status?: number }).status === 401) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }
      next(error);
    }
  };
}

export function assertPermission(req: AuthedRequest, permission: Permission): Promise<void>;
export function assertPermission<C extends PermissionCategory>(
  req: AuthedRequest,
  scope: C,
  action: PermissionAction<C>,
): Promise<void>;
export async function assertPermission<C extends PermissionCategory>(
  req: AuthedRequest,
  scopeOrPermission: Permission | C,
  action?: PermissionAction<C>,
): Promise<void> {
  if (!hasAuthedUser(req)) {
    const error = new Error('Unauthorized');
    (error as { status?: number }).status = 401;
    throw error;
  }
  const permission = toPermissionKey(scopeOrPermission, action);
  const { permissions } = await resolvePermissionsForRequest(req);
  if (!hasPermission(permissions, permission)) {
    const error = new Error('Forbidden');
    (error as { status?: number }).status = 403;
    throw error;
  }
}

export default {
  requirePermission,
  assertPermission,
};

export { hasPermission } from '../../services/permissionService';

export type { Permission } from '../../shared/permissions';
