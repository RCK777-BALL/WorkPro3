/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useRef, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import type { PermissionScope, PermissionAction } from './permissions';
import { usePermissions } from './usePermissions';
import { useAuth } from '@/context/AuthContext';
import { emitToast } from '@/context/ToastContext';

interface RequirePermissionProps {
  scope: PermissionScope;
  action: PermissionAction;
  children: ReactNode;
}

export const RequirePermission = ({ scope, action, children }: RequirePermissionProps) => {
  const { can } = usePermissions();
  const { loading } = useAuth();
  const location = useLocation();
  const { t } = useTranslation();
  const hasNotifiedRef = useRef(false);

  useEffect(() => {
    if (loading) return;
    if (!can(scope, action) && !hasNotifiedRef.current) {
      emitToast(t('auth.permissionDenied'), 'error');
      hasNotifiedRef.current = true;
    }
  }, [action, can, loading, scope, t]);

  if (loading) {
    return null;
  }

  if (!can(scope, action)) {
    return (
      <Navigate
        to="/dashboard"
        replace
        state={{ from: location, unauthorized: true, message: t('auth.permissionRedirect') }}
      />
    );
  }

  return <>{children}</>;
};
