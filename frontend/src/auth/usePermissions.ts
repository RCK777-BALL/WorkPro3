/*
 * SPDX-License-Identifier: MIT
 */

import { useCallback, useMemo } from 'react';

import {
  formatPermission,
  type Permission,
  type PermissionAction,
  type PermissionCategory,
} from '@backend-shared/permissions';
import type { PermissionGrant } from '@backend-shared/admin';
import { useAuth } from '@/context/AuthContext';
import { SITE_KEY, TENANT_KEY } from '@/lib/http';
import { safeLocalStorage } from '@/utils/safeLocalStorage';

const normalizePermissions = (permissions?: Array<string | PermissionGrant>): Permission[] => {
  if (!Array.isArray(permissions)) return [];
  const normalized: Permission[] = [];

  for (const permission of permissions) {
    const raw =
      typeof permission === 'string'
        ? permission
        : typeof permission === 'object'
          ? (permission as { permission?: unknown }).permission
          : undefined;

    if (typeof raw !== 'string') continue;
    const key = raw.trim().toLowerCase() as Permission;
    if (!normalized.includes(key)) {
      normalized.push(key);
    }
  }

  return normalized;
};

const normalizePermissionKey = (
  permissionOrScope: Permission | PermissionCategory,
  action?: PermissionAction,
): Permission => {
  if (!permissionOrScope) return '' as Permission;
  return formatPermission(String(permissionOrScope), action as string | undefined);
};

export interface UsePermissionsResult {
  can: (permissionOrScope: Permission | PermissionCategory, action?: PermissionAction) => boolean;
  canAny: (permissions: Array<Permission | [PermissionCategory, PermissionAction]>) => boolean;
  permissions: Permission[];
}

export const usePermissions = (): UsePermissionsResult => {
  const { user } = useAuth();

  const permissionSet = useMemo(() => {
    const normalized = normalizePermissions(user?.permissions ?? (user as { permissions?: string[] })?.permissions);
    const set = new Set<Permission>(normalized);
    return set;
  }, [user]);

  const explicitPermissions = useMemo(() => {
    const normalized = normalizePermissions(user?.permissions as Array<string | PermissionGrant>);
    if (!normalized.length) return null;
    return new Set(normalized);
  }, [user]);

  const tenantId = useMemo(
    () => user?.tenantId ?? safeLocalStorage.getItem(TENANT_KEY) ?? undefined,
    [user?.tenantId],
  );

  const siteId = useMemo(
    () => user?.siteId ?? safeLocalStorage.getItem(SITE_KEY) ?? undefined,
    [user?.siteId],
  );

  const can = useCallback(
    (permissionOrScope: Permission | PermissionCategory, action?: PermissionAction) => {
      if (!user) return false;
      const key = normalizePermissionKey(permissionOrScope, action);
      const [scope] = key.split('.', 1);
      return (
        permissionSet.has('*' as Permission) ||
        permissionSet.has(`${scope}.*` as Permission) ||
        permissionSet.has(key)
      );
    },
    [permissionSet, user],
  );

  const canAny = useCallback(
    (permissions: Array<Permission | [PermissionCategory, PermissionAction]>) => {
      return permissions.some((permission) =>
        Array.isArray(permission) ? can(permission[0], permission[1]) : can(permission),
      );
    },
    [can],
  );

  return { can, canAny, permissions: Array.from(permissionSet.values()) };
};
