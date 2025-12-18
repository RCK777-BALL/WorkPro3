/*
 * SPDX-License-Identifier: MIT
 */

import { Types } from 'mongoose';

import Role from '../models/Role';
import UserRoleAssignment from '../models/UserRoleAssignment';
import permissionsMatrixJson from '../../shared/auth/permissions.json';
import roleHierarchy from '../../shared/auth/roleHierarchy.json';
import { ALL_PERMISSIONS, formatPermission, type Permission } from '../shared/permissions';
import type {
  PermissionScope,
  PermissionsMatrix,
  RoleHierarchy,
  RoleHierarchyEntry,
} from '../../shared/types/auth';

const permissionsMatrix: PermissionsMatrix = permissionsMatrixJson;
type RoleHierarchyMap = RoleHierarchy & Record<string, RoleHierarchyEntry | undefined>;
const roleHierarchyMap: RoleHierarchyMap = roleHierarchy;

const normalizePermission = (permission: string): Permission =>
  permission.trim().toLowerCase() as Permission;

const buildRolePermissionMap = (
  matrix: PermissionsMatrix,
  hierarchy: RoleHierarchyMap,
): Map<string, Set<Permission>> => {
  const map = new Map<string, Set<Permission>>();

  for (const [scope, actions] of Object.entries(matrix) as [
    PermissionScope,
    PermissionsMatrix[PermissionScope],
  ][]) {
    for (const [action, roles] of Object.entries(actions) as [string, string[]][]) {
      const permission = formatPermission(scope, action);
      roles.forEach((role: string) => {
        if (!map.has(role)) {
          map.set(role, new Set());
        }
        map.get(role)!.add(permission);
      });
    }
  }

  const resolveHierarchyPermissions = (role: string, visited: Set<string>): Set<Permission> => {
    if (visited.has(role)) return new Set();
    visited.add(role);
    const def = hierarchy[role];
    const inherited = new Set<Permission>();
    if (def?.inherits) {
      for (const parent of def.inherits) {
        const parentPerms = resolveHierarchyPermissions(parent, visited);
        parentPerms.forEach((perm) => inherited.add(perm));
      }
    }
    if (def?.permissions) {
      def.permissions
        .map(normalizePermission)
        .forEach((perm: Permission) => inherited.add(perm));
    }
    return inherited;
  };

  for (const role of Object.keys(hierarchy)) {
    const existing = map.get(role) ?? new Set<Permission>();
    resolveHierarchyPermissions(role, new Set()).forEach((perm) => existing.add(perm));
    map.set(role, existing);
  }

  return map;
};

const ROLE_PERMISSION_MAP = buildRolePermissionMap(permissionsMatrix, roleHierarchyMap);

const toObjectId = (value: unknown): Types.ObjectId | undefined => {
  if (!value) return undefined;
  if (value instanceof Types.ObjectId) return value;
  if (typeof value === 'string' && Types.ObjectId.isValid(value)) {
    return new Types.ObjectId(value);
  }
  return undefined;
};

export interface PermissionResolutionInput {
  userId: string | Types.ObjectId;
  tenantId?: string | Types.ObjectId;
  siteId?: string | Types.ObjectId | null;
  departmentId?: string | Types.ObjectId | null;
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
  const departmentId = toObjectId(input.departmentId);

  if (!userId || !tenantId) {
    return {
      roles: input.fallbackRoles ?? [],
      permissions: [],
    };
  }

  const match: Record<string, unknown> = { userId, tenantId };
  match.$or = [
    { siteId: { $exists: false }, departmentId: { $exists: false } },
    { siteId: null, departmentId: null },
  ];
  if (siteId) {
    (match.$or as unknown[]).push({ siteId, departmentId: { $exists: false } }, { siteId, departmentId: null });
  }
  if (departmentId) {
    (match.$or as unknown[]).push({ departmentId, ...(siteId ? { siteId } : {}) });
  }

  const assignments = await UserRoleAssignment.find(match).lean();
  const roleIds = assignments
    .map((assignment) => toObjectId(assignment.roleId))
    .filter((value): value is Types.ObjectId => Boolean(value));

  const roleFilter: Record<string, unknown> = { _id: { $in: roleIds }, tenantId };
  const roleScope: Record<string, unknown>[] = [
    { siteId: { $exists: false }, departmentId: { $exists: false } },
    { siteId: null, departmentId: null },
  ];
  if (siteId) {
    roleScope.push({ siteId, departmentId: { $exists: false } }, { siteId, departmentId: null });
  }
  if (departmentId) {
    roleScope.push({ departmentId, ...(siteId ? { siteId } : {}) });
  }
  if (roleScope.length > 0) {
    roleFilter.$or = roleScope;
  }

  const roles = roleIds.length > 0 ? await Role.find(roleFilter).lean() : [];

  const permissionSet = new Set<Permission>();
  const roleNames = new Set<string>();

  const roleByName = new Map<string, typeof roles[number]>();
  for (const role of roles) {
    if (role.name) {
      roleNames.add(role.name);
      roleByName.set(role.name, role);
    }

    for (const permission of role.permissions ?? []) {
      const normalized = normalizePermission(String(permission));
      permissionSet.add(normalized);
    }
  }

  const resolveInherited = (roleName: string, visited: Set<string>) => {
    if (visited.has(roleName)) return;
    visited.add(roleName);
    const definition = roleHierarchyMap[roleName];
    const doc = roleByName.get(roleName);
    const inherits = new Set<string>(definition?.inherits ?? []);
    (doc?.inheritsFrom ?? []).forEach((name) => inherits.add(name));
    inherits.forEach((parent) => {
      const inheritedPermissions = ROLE_PERMISSION_MAP.get(parent);
      if (inheritedPermissions) {
        inheritedPermissions.forEach((perm) => permissionSet.add(perm));
      }
      const parentDoc = roleByName.get(parent);
      parentDoc?.permissions?.forEach((perm) => permissionSet.add(normalizePermission(String(perm))));
      resolveInherited(parent, visited);
    });
  };

  for (const roleName of roleNames) {
    const inheritedPermissions = ROLE_PERMISSION_MAP.get(roleName);
    inheritedPermissions?.forEach((perm) => permissionSet.add(perm));
    resolveInherited(roleName, new Set());
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
