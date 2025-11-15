/*
 * SPDX-License-Identifier: MIT
 */

import { useCallback, useMemo } from 'react';

import { permissionsMatrix, type PermissionScope, type PermissionAction } from './permissions';
import { useAuth } from '@/context/AuthContext';
import type { AuthRole } from '@/types';

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

  const can = useCallback(
    (scope: PermissionScope, action: PermissionAction) => {
      if (!user) {
        return false;
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
    [roles, user],
  );

  return { can };
};
