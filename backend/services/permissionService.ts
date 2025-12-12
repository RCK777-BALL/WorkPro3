/*
 * SPDX-License-Identifier: MIT
 */

import { Types } from 'mongoose';

import Role from '../models/Role';
import UserRoleAssignment from '../models/UserRoleAssignment';
import permissionsMatrix from '../src/auth/permissions.json';
import { ALL_PERMISSIONS, formatPermission, type Permission } from '../shared/permissions';
import type { PermissionsMatrix } from '../types/auth';

const buildRolePermissionMap = (matrix: PermissionsMatrix): Map<string, Set<Permission>> => {
  const map = new Map<string, Set<Permission>>();

  for (const [scope, actions] of Object.entries(matrix)) {
    for (const [action, roles] of Object.entries(actions)) {
      const permission = formatPermission(scope, action);
      roles.forEach((role) => {
        if (!map.has(role)) {
          map.set(role, new Set());
        }
        map.get(role)!.add(permission);
      });
    }
  }

  return map;
};

const ROLE_PERMISSION_MAP = buildRolePermissionMap(permissionsMatrix as PermissionsMatrix);

const toObjectId = (value: unknown): Types.ObjectId | undefined => {
  if (!value) return undefined;
  if (value instanceof Types.ObjectId) return value;
  if (typeof value === 'string' && Types.ObjectId.isValid(value)) {
    return new Types.ObjectId(value);
  }
  return undefined;
};

const normalizePermission = (permission: string): Permission =>
  permission.trim().toLowerCase() as Permission;

export interface PermissionResolutionInput {
  userId: string | Types.ObjectId;
  tenantId?: string | Types.ObjectId;
  siteId?: string | Types.ObjectId | null;
  fallbackRoles?: string[];
}

export interface PermissionResolutionResult {
  roles: string[];
  permissions: Permission[];
}

export const resolveUserPermissions = async (
  input: PermissionResolutionInput,
): Promise<PermissionResolutionResult> => {
  const userId = toObjectId(input.userId);
  const tenantId = toObjectId(input.tenantId);
  const siteId = toObjectId(input.siteId);

  if (!userId || !tenantId) {
    return {
      roles: input.fallbackRoles ?? [],
      permissions: [],
    };
  }

  const match: Record<string, unknown> = { userId, tenantId };
  match.$or = [{ siteId: { $exists: false } }, { siteId: null }];
  if (siteId) {
    (match.$or as unknown[]).push({ siteId });
  }

  const assignments = await UserRoleAssignment.find(match).lean();
  const roleIds = assignments
    .map((assignment) => toObjectId(assignment.roleId))
    .filter((value): value is Types.ObjectId => Boolean(value));

  const roleFilter: Record<string, unknown> = { _id: { $in: roleIds }, tenantId };
  if (siteId) {
    roleFilter.$or = [{ siteId: { $exists: false } }, { siteId: null }, { siteId }];
  }

  const roles = roleIds.length > 0 ? await Role.find(roleFilter).lean() : [];

  const permissionSet = new Set<Permission>();
  const roleNames = new Set<string>();

  for (const role of roles) {
    if (role.name) {
      roleNames.add(role.name);
    }

    for (const permission of role.permissions ?? []) {
      const normalized = normalizePermission(String(permission));
      permissionSet.add(normalized);
    }
  }

  if (roleNames.size === 0 && input.fallbackRoles) {
    input.fallbackRoles.forEach((role) => roleNames.add(role));
  }

  const fallbackRoles = input.fallbackRoles ?? [];
  if (fallbackRoles.length > 0) {
    for (const role of fallbackRoles) {
      const mappedPermissions = ROLE_PERMISSION_MAP.get(role);
      if (mappedPermissions) {
        mappedPermissions.forEach((permission) => permissionSet.add(permission));
      }

      if (['admin', 'global_admin', 'plant_admin'].includes(role)) {
        ALL_PERMISSIONS.forEach((permission) => permissionSet.add(permission));
      }
    }
  }

  return {
    roles: Array.from(roleNames),
    permissions: Array.from(permissionSet),
  };
};

export const hasPermission = (permissionList: Permission[] | undefined, permission: string): boolean => {
  if (!permissionList || permissionList.length === 0) return false;
  const normalized = normalizePermission(permission);
  const [scope] = normalized.split('.', 1);
  const scopeWildcard = `${scope}.*` as Permission;
  return (
    permissionList.includes(normalized) ||
    permissionList.includes('*' as Permission) ||
    permissionList.includes(scopeWildcard)
  );
};

export const ensurePermissionList = (value: unknown): Permission[] => {
  if (!Array.isArray(value)) return [];
  return value.map((permission) => normalizePermission(String(permission)));
};
