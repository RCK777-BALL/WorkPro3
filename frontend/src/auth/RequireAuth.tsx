/*
 * SPDX-License-Identifier: MIT
 */

import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '@/context/AuthContext';

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
      <div className="flex h-screen w-full items-center justify-center bg-black text-white">
        Checking access…
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
