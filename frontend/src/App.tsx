/*
 * SPDX-License-Identifier: MIT
 */

import React from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";

import Layout from "@/components/layout/Layout";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import { useAuth } from "@/context/AuthContext";
import {
  FALLBACK_TOKEN_KEY,
  SITE_KEY,
  TENANT_KEY,
  TOKEN_KEY,
  USER_STORAGE_KEY,
  setUnauthorizedCallback,
} from "@/lib/http";
import Dashboard from "@/pages/Dashboard";
import Analytics from "@/pages/Analytics";
import WorkOrders from "@/pages/WorkOrders";
import Maintenance from "@/pages/Maintenance";
import AssetsPage from "@/pages/AssetsPage";
import AssetDetails from "@/pages/AssetDetails";
import Inventory from "@/pages/Inventory";
import VendorsPage from "@/pages/VendorsPage";
import Reports from "@/pages/Reports";
import Notifications from "@/pages/Notifications";
import Messages from "@/pages/Messages";
import Documentation from "@/pages/Documentation";
import Departments from "@/pages/Departments";
import Teams from "@/pages/Teams";
import TeamMemberProfile from "@/pages/TeamMemberProfile";
import Settings from "@/pages/Settings";
import TimeSheets from "@/pages/TimeSheets";
import PMScheduler from "@/pages/PMScheduler";
import PMTasksPage from "@/pages/PMTasksPage";
import AdminTenants from "@/pages/AdminTenants";
import Imports from "@/pages/Imports";
import Login from "@/pages/Login";
import RegisterPage from "@/pages/RegisterPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import NotFound from "@/pages/NotFound";

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const { resetAuthState } = useAuth();
  const { pathname } = location;

  React.useEffect(() => {
    setUnauthorizedCallback(() => {
      localStorage.removeItem(FALLBACK_TOKEN_KEY);
      localStorage.removeItem(USER_STORAGE_KEY);
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(TENANT_KEY);
      localStorage.removeItem(SITE_KEY);
      resetAuthState();
      navigate("/login");
    });
  }, [navigate, resetAuthState]);

  const isAuthRoute =
    pathname.startsWith("/login") || pathname.startsWith("/register") || pathname.startsWith("/forgot");

  React.useEffect(() => {
    if (isAuthRoute) return;
    // api.me().catch(() => {/* handled globally */});
  }, [isAuthRoute]);

  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot" element={<ForgotPasswordPage />} />
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/work-orders" element={<WorkOrders />} />
          <Route path="/workorders" element={<WorkOrders />} />
          <Route path="/maintenance" element={<Maintenance />} />
          <Route path="/assets" element={<AssetsPage />} />
          <Route path="/assets/:assetId" element={<AssetDetails />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/vendors" element={<VendorsPage />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/documentation" element={<Documentation />} />
          <Route path="/departments" element={<Departments />} />
          <Route path="/teams" element={<Teams />} />
          <Route path="/team-members/:teamMemberId" element={<TeamMemberProfile />} />
          <Route path="/pm/scheduler" element={<PMScheduler />} />
          <Route path="/pm/tasks" element={<PMTasksPage />} />
          <Route path="/timesheets" element={<TimeSheets />} />
          <Route path="/admin/tenants" element={<AdminTenants />} />
          <Route path="/imports" element={<Imports />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}
