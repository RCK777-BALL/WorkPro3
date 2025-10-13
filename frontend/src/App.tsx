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
import { API_BASE } from './utils/api';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const { resetAuthState, login: authLogin } = useAuth();
  const [loginError, setLoginError] = React.useState<string | null>(null);
  const [inflight, setInflight] = React.useState(false);
  const oauthBase = `${API_BASE}/auth/oauth`;
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
                  const result = await authLogin(email, password, !!remember);

                  if ('mfaRequired' in result) {
                    setLoginError('Multi-factor authentication is required. Please complete verification to continue.');
                    return;
                  }

                  navigate('/dashboard', { replace: true });
                } catch (e: any) {
                  const msg = e?.data?.message || e?.message || 'Login failed';
                  setLoginError(msg);
                } finally {
                  setInflight(false);
                }
              }}
              onGoogle={() => (window.location.href = `${oauthBase}/google`)}
              onGithub={() => (window.location.href = `${oauthBase}/github`)}
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
