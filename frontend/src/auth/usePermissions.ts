/*
 * SPDX-License-Identifier: MIT
 */

import { useCallback, useMemo } from 'react';

import { permissionsMatrix, type PermissionScope, type PermissionAction } from './permissions';
import { useAuth } from '@/context/AuthContext';
import type { AuthRole } from '@/types';
import { SITE_KEY, TENANT_KEY } from '@/lib/http';
import { safeLocalStorage } from '@/utils/safeLocalStorage';

const ADMIN_ROLES: AuthRole[] = ['global_admin', 'plant_admin'];

const normalizeRoles = (roles?: AuthRole[] | string[]): AuthRole[] => {
  if (!roles) return [];
  const normalized: AuthRole[] = [];
  for (const role of roles) {
    if (typeof role !== 'string') continue;
    const value = role.toLowerCase() as AuthRole;
    if (!normalized.includes(value)) {
      normalized.push(value);
    }
  }
  return normalized;
};

export const usePermissions = () => {
  const { user } = useAuth();

  const roles = useMemo(() => {
    if (!user) return [] as AuthRole[];
    const merged: (AuthRole | string)[] = [];
    if (user.role) {
      merged.push(user.role);
    }
    if (user.roles) {
      merged.push(...user.roles);
    }
    return normalizeRoles(merged as AuthRole[]);
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
    (scope: PermissionScope, action: PermissionAction) => {
      if (!user) {
        return false;
      }

      if (hasScopedPermission(scope, action)) {
        return true;
      }

      if (roles.some((role) => ADMIN_ROLES.includes(role))) {
        return true;
      }
      const allowed = permissionsMatrix[scope]?.[action];
      if (!Array.isArray(allowed)) {
        return false;
      }
      const allowedSet = new Set(allowed.map((role) => role.toLowerCase()));
      return roles.some((role) => allowedSet.has(role));
    },
    [hasScopedPermission, roles, user],
  );

  return { can };
};
