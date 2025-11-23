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
import { useAuth } from '@/context/AuthContext';

const normalizePermissions = (permissions?: string[]): Permission[] => {
  if (!Array.isArray(permissions)) return [];
  const normalized: Permission[] = [];
  for (const permission of permissions) {
    if (typeof permission !== 'string') continue;
    const key = permission.trim().toLowerCase() as Permission;
    if (!normalized.includes(key)) {
      normalized.push(key);
    }
  }
  return normalized;
};

const normalizePermissionKey = (
  permissionOrScope: Permission | PermissionCategory,
  action?: PermissionAction,
): Permission => formatPermission(String(permissionOrScope), action as string | undefined);

export const usePermissions = () => {
  const { user } = useAuth();

  const permissionSet = useMemo(() => {
    const normalized = normalizePermissions(user?.permissions ?? (user as { permissions?: string[] })?.permissions);
    const set = new Set<Permission>(normalized);
    return set;
  }, [user]);

  const explicitPermissions = useMemo(() => {
    if (!user?.permissions?.length) return null;
    return new Set(user.permissions.map((permission) => permission.toLowerCase()));
  }, [user]);

  const tenantId = useMemo(
    () => user?.tenantId ?? safeLocalStorage.getItem(TENANT_KEY) ?? undefined,
    [user?.tenantId],
  );

  const siteId = useMemo(
    () => user?.siteId ?? safeLocalStorage.getItem(SITE_KEY) ?? undefined,
    [user?.siteId],
  );

  const hasScopedPermission = useCallback(
    (scope: PermissionScope, action: PermissionAction) => {
      if (!user?.permissions?.length) return false;
      return user.permissions.some((grant) => {
        if (grant.scope !== scope) return false;
        if (!grant.actions.includes(action)) return false;
        if (grant.tenantId && tenantId && grant.tenantId !== tenantId) return false;
        if (grant.siteId && siteId && grant.siteId !== siteId) return false;
        return true;
      });
    },
    [siteId, tenantId, user?.permissions],
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
