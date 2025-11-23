/*
 * SPDX-License-Identifier: MIT
 */

import type { RequestHandler } from 'express';

import type { AuthedRequest } from '../../types/http';
import type { UserRole } from '../../types/auth';
import type { PermissionAssignment } from '@shared/auth';
import permissionsMatrix from './permissions.json';

export type PermissionsMatrix = typeof permissionsMatrix;
export type PermissionScope = keyof PermissionsMatrix;
export type PermissionAction<S extends PermissionScope = PermissionScope> = keyof PermissionsMatrix[S];

const ADMIN_ROLES: readonly UserRole[] = ['global_admin', 'plant_admin'];

const toRoleList = (input: unknown): string[] => {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input.map((role) => (typeof role === 'string' ? role.toLowerCase() : '')).filter(Boolean);
  }
  if (typeof input === 'string') {
    return [input.toLowerCase()];
  }
  return [];
};

export const hasPermission = <S extends PermissionScope>(
  roles: string[] | undefined,
  scope: S,
  action: PermissionAction<S>,
  permissions?: PermissionAssignment[],
  tenantId?: string,
  siteId?: string,
): boolean => {
  if (permissions?.length) {
    const matched = permissions.some((grant) => {
      if (grant.scope !== scope) return false;
      if (!grant.actions.includes(action)) return false;
      if (grant.tenantId && tenantId && grant.tenantId !== tenantId) return false;
      if (grant.siteId && siteId && grant.siteId !== siteId) return false;
      return true;
    });
    if (matched) {
      return true;
    }
  }

  if (!roles || roles.length === 0) {
    return false;
  }

  const normalizedRoles = roles.map((role) => role.toLowerCase());

  if (normalizedRoles.some((role) => ADMIN_ROLES.includes(role as UserRole))) {
    return true;
  }

  const allowed = permissionsMatrix[scope]?.[action];
  if (!Array.isArray(allowed)) {
    return false;
  }

  const allowedSet = new Set(allowed.map((role) => role.toLowerCase()));
  return normalizedRoles.some((role) => allowedSet.has(role));
};

export const requirePermission = <S extends PermissionScope>(
  scope: S,
  action: PermissionAction<S>,
): RequestHandler =>
  (req, res, next): void => {
    const authedReq = req as AuthedRequest;
    const user = authedReq.user as { roles?: unknown; role?: unknown; permissions?: PermissionAssignment[] } | undefined;
    const roles = toRoleList(user?.roles);
    if (roles.length === 0 && user?.role) {
      roles.push(...toRoleList(user.role));
    }

    const permissions = Array.isArray(user?.permissions) ? user?.permissions : undefined;

    if (!hasPermission(roles, scope, action, permissions, authedReq.tenantId, authedReq.siteId)) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    next();
  };

export default {
  hasPermission,
  requirePermission,
};
