/*
 * SPDX-License-Identifier: MIT
 */

import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '@/context/AuthContext';
import LoadingSpinner from '@/components/common/LoadingSpinner';

interface RequireAuthProps {
  children: ReactNode;
}

const buildRedirectParam = (pathname: string, search: string): string | undefined => {
  const target = `${pathname}${search}`;
  if (!target || target === '/' || target.startsWith('/login')) {
    return undefined;
  }
  return encodeURIComponent(target);
};

export const RequireAuth = ({ children }: RequireAuthProps) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-slate-950 text-slate-100">
        <div className="flex flex-col items-center gap-3">
          <LoadingSpinner size="lg" />
          <span className="text-sm text-slate-300">Checking access…</span>
        </div>
      </div>
    );
  }

  if (!user) {
    const redirect = buildRedirectParam(location.pathname, location.search);
    const destination = redirect ? `/login?redirect=${redirect}` : '/login';
    return <Navigate to={destination} replace />;
  }

  return <>{children}</>;
};
