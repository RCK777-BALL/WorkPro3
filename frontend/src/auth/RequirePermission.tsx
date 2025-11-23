/*
 * SPDX-License-Identifier: MIT
 */

import type { ReactNode } from 'react';
import { formatPermission, type Permission, type PermissionAction, type PermissionCategory } from '@shared/permissions';
import { usePermissions } from './usePermissions';

interface RequirePermissionProps {
  permission?: Permission;
  scope?: PermissionCategory;
  action?: PermissionAction;
  children: ReactNode;
}

export const RequirePermission = ({ permission, scope, action, children }: RequirePermissionProps) => {
  const { can } = usePermissions();
  const permissionKey = permission ?? (scope && action ? formatPermission(scope, action) : undefined);

  if (!permissionKey || !can(permissionKey)) {
    return null;
  }

  return <>{children}</>;
};
