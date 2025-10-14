/*
 * SPDX-License-Identifier: MIT
 */

import React from 'react';
import { Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Imports from './pages/Imports';
import Layout from './components/layout/Layout';
import ErrorBoundary from './components/common/ErrorBoundary';
import Reports from './pages/Reports';
import { useAuth } from '@/context/AuthContext';
import {
  setUnauthorizedCallback,
  TOKEN_KEY,
  TENANT_KEY,
  SITE_KEY,
} from '@/lib/http';
import Login from './pages/Login';
import WorkOrdersPage from './pages/workorders/WorkOrdersPage';
import PermitsPage from './pages/permits/PermitsPage';
import AnalyticsPage from './pages/analytics/AnalyticsPage';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const { resetAuthState } = useAuth();
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
        <Route path="/login" element={<Login />} />
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/dashboard" />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/work-orders" element={<WorkOrdersPage />} />
          <Route path="/permits" element={<PermitsPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/imports" element={<Imports />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}
