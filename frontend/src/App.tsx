/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect } from 'react';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
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

export default function App() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  useEffect(() => {
    setUnauthorizedCallback(() => {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(TENANT_KEY);
      localStorage.removeItem(SITE_KEY);
      logout();
      navigate('/login');
    });
  }, [logout, navigate]);

  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/dashboard" />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/imports" element={<Imports />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}
