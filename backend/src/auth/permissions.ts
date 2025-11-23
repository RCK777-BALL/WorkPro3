/*
 * SPDX-License-Identifier: MIT
 */

import type { RequestHandler } from 'express';

import type { AuthedRequest } from '../../types/http';
import type { UserRole } from '../../types/auth';
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

const toPermissionSet = (input: unknown): Set<string> => {
  if (!input) return new Set();
  const list = Array.isArray(input) ? input : [input];
  const normalized = list
    .map((value) => (typeof value === 'string' ? value.toLowerCase() : ''))
    .filter(Boolean);
  return new Set(normalized);
};

export const hasPermission = <S extends PermissionScope>(
  roles: string[] | undefined,
  scope: S,
  action: PermissionAction<S>,
  permissions?: Set<string> | string[] | undefined,
): boolean => {
  if (!roles || roles.length === 0) {
    const explicit = permissions instanceof Set ? permissions : toPermissionSet(permissions);
    const permissionKey = `${String(scope)}:${String(action)}`.toLowerCase();
    return explicit.has(permissionKey);
  }

  const normalizedRoles = roles.map((role) => role.toLowerCase());

  if (normalizedRoles.some((role) => ADMIN_ROLES.includes(role as UserRole))) {
    return true;
  }

  const explicit = permissions instanceof Set ? permissions : toPermissionSet(permissions);
  const permissionKey = `${String(scope)}:${String(action)}`.toLowerCase();
  if (explicit.has(permissionKey)) {
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
    const user = authedReq.user as { roles?: unknown; role?: unknown; permissions?: unknown } | undefined;
    const roles = toRoleList(user?.roles);
    if (roles.length === 0 && user?.role) {
      roles.push(...toRoleList(user.role));
    }

    const permissions = toPermissionSet(user?.permissions);

    if (!hasPermission(roles, scope, action, permissions)) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    next();
  };

export default {
  hasPermission,
  requirePermission,
};
