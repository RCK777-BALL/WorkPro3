/*
 * SPDX-License-Identifier: MIT
 */

import React from 'react';
import { Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import Imports from './pages/Imports';
import Layout from './components/layout/Layout';
import ErrorBoundary from './components/common/ErrorBoundary';
import Reports from './pages/Reports';
import { useAuth } from '@/context/AuthContext';
import SafetyPermits from './pages/SafetyPermits';
import {
  setUnauthorizedCallback,
  TOKEN_KEY,
  TENANT_KEY,
  SITE_KEY,
} from '@/lib/http';
import PlatinumLoginVanilla from './components/PlatinumLoginVanilla';
import { api } from './utils/api';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const { resetAuthState, setUser } = useAuth();
  const [loginError, setLoginError] = React.useState<string | null>(null);
  const [inflight, setInflight] = React.useState(false);
  const { pathname } = location;

  React.useEffect(() => {
    setUnauthorizedCallback(() => {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(TENANT_KEY);
      localStorage.removeItem(SITE_KEY);
      resetAuthState();
      navigate('/login');
    });
  }, [navigate, resetAuthState]);

  // IMPORTANT: do not call /auth/me while on login/register/forgot to avoid 401 spam
  const isAuthRoute =
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/forgot');

  React.useEffect(() => {
    if (isAuthRoute) return;
    // Optionally fetch current user for protected areas
    // api.me().catch(() => {/* ignore here, handled by guards */});
  }, [isAuthRoute]);

  return (
    <ErrorBoundary>
      <Routes>
        <Route
          path="/login"
          element={
            <PlatinumLoginVanilla
              errorMessage={loginError}
              onSubmit={async (email, password, remember) => {
                if (inflight) return;
                setInflight(true);
                setLoginError(null);
                try {
                  const result = await api.login({ email, password, remember: !!remember });
                  if (result?.user) {
                    setUser(result.user);
                    const maybeToken = (result as { token?: string }).token;
                    if (maybeToken) {
                      localStorage.setItem(TOKEN_KEY, maybeToken);
                    } else {
                      localStorage.removeItem(TOKEN_KEY);
                    }
                    const maybeTenant = (result as { user?: { tenantId?: string } }).user?.tenantId;
                    if (maybeTenant) {
                      localStorage.setItem(TENANT_KEY, maybeTenant);
                    }
                    const maybeSite = (result as { user?: { siteId?: string } }).user?.siteId;
                    if (maybeSite) {
                      localStorage.setItem(SITE_KEY, maybeSite);
                    }
                  }
                  navigate('/', { replace: true });
                } catch (e: any) {
                  const msg = e?.data?.message || e?.message || 'Login failed';
                  setLoginError(msg);
                } finally {
                  setInflight(false);
                }
              }}
              onGoogle={() => (window.location.href = `${import.meta.env.VITE_API_BASE || ''}/auth/google`)}
              onGithub={() => (window.location.href = `${import.meta.env.VITE_API_BASE || ''}/auth/github`)}
            />
          }
        />
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/dashboard" />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/permits" element={<SafetyPermits />} />
          <Route path="/imports" element={<Imports />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}
