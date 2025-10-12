/*
 * SPDX-License-Identifier: MIT
 */

import React from 'react';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
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
import PlatinumLogin from './components/PlatinumLogin';
import { api } from './utils/api';

export default function App() {
  const navigate = useNavigate();
  const { resetAuthState } = useAuth();
  const [loginError, setLoginError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setUnauthorizedCallback(() => {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(TENANT_KEY);
      localStorage.removeItem(SITE_KEY);
      resetAuthState();
      navigate('/login');
    });
  }, [navigate, resetAuthState]);

  return (
    <ErrorBoundary>
      <Routes>
        <Route
          path="/login"
          element={
            <PlatinumLogin
              brandName="CMMS"
              productName="WorkPro Suite"
              errorMessage={loginError}
              onSubmit={async (email, password, remember) => {
                try {
                  setLoginError(null);
                  await api.login({ email, password, remember });
                  window.location.href = '/';
                } catch (error: unknown) {
                  if (error instanceof Error) {
                    setLoginError(error.message || 'Login failed');
                  } else {
                    setLoginError('Login failed');
                  }
                }
              }}
              onGoogle={() => api.oauth('google')}
              onGithub={() => api.oauth('github')}
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
