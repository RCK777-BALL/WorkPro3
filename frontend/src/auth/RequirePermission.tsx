/*
 * SPDX-License-Identifier: MIT
 */

import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import type { PermissionScope, PermissionAction } from './permissions';
import { usePermissions } from './usePermissions';
import { useAuth } from '@/context/AuthContext';

interface RequirePermissionProps {
  scope: PermissionScope;
  action: PermissionAction;
  children: ReactNode;
}

export const RequirePermission = ({ scope, action, children }: RequirePermissionProps) => {
  const { can } = usePermissions();
  const { loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return null;
  }

  if (!can(scope, action)) {
    return <Navigate to="/dashboard" replace state={{ from: location }} />;
  }

  return <>{children}</>;
};
