/*
 * SPDX-License-Identifier: MIT
 */

import React from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";

import Layout from "@/components/layout/Layout";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import { useAuth } from "@/context/AuthContext";
import { RequireAuth } from "@/auth/RequireAuth";
import { RequirePermission } from "@/auth/RequirePermission";
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
import WorkRequestDashboard from "@/pages/WorkRequestDashboard";
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
import Lines from "@/pages/Lines";
import Stations from "@/pages/Stations";
import Teams from "@/pages/Teams";
import { AssetExplorerPage } from "@/features/assets";
import PermitsPage from "@/pages/PermitsPage";
import TeamMemberProfile from "@/pages/TeamMemberProfile";
import Settings from "@/pages/Settings";
import TimeSheets from "@/pages/TimeSheets";
import PMScheduler from "@/pages/PMScheduler";
import PMTasksPage from "@/pages/PMTasksPage";
import AdminTenants from "@/pages/AdminTenants";
import Imports from "@/pages/Imports";
import Plants from "@/pages/Plants";
import GlobalAnalyticsDashboard from "@/pages/GlobalAnalyticsDashboard";
import AIDashboard from "@/pages/AIDashboard";
import TechnicianConsole from "@/pages/TechnicianConsole";
import Login from "@/pages/Login";
import RegisterPage from "@/pages/RegisterPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import { safeLocalStorage } from "@/utils/safeLocalStorage";
import PublicRequestPage from "@/public/request";

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const { resetAuthState } = useAuth();
  const { pathname } = location;

  React.useEffect(() => {
    setUnauthorizedCallback(() => {
      safeLocalStorage.removeItem(FALLBACK_TOKEN_KEY);
      safeLocalStorage.removeItem(USER_STORAGE_KEY);
      safeLocalStorage.removeItem(TOKEN_KEY);
      safeLocalStorage.removeItem(TENANT_KEY);
      safeLocalStorage.removeItem(SITE_KEY);
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
        <Route path="/public/request/:slug?" element={<PublicRequestPage />} />
        <Route element={<RequireAuth><Layout /></RequireAuth>}>
          <Route index element={<Navigate to="/dashboard" />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/analytics/global" element={<GlobalAnalyticsDashboard />} />
          <Route path="/analytics/ai" element={<AIDashboard />} />
          <Route path="/work-orders" element={<WorkOrders />} />
          <Route path="/workorders" element={<WorkOrders />} />
          <Route
            path="/work-requests"
            element={
              <RequirePermission scope="workRequests" action="read">
                <WorkRequestDashboard />
              </RequirePermission>
            }
          />
          <Route path="/maintenance" element={<Maintenance />} />
          <Route path="/permits" element={<PermitsPage />} />
          <Route
            path="/assets"
            element={
              <RequirePermission scope="hierarchy" action="read">
                <AssetsPage />
              </RequirePermission>
            }
          />
          <Route
            path="/assets/explorer"
            element={
              <RequirePermission scope="hierarchy" action="read">
                <AssetExplorerPage />
              </RequirePermission>
            }
          />
          <Route
            path="/assets/:assetId"
            element={
              <RequirePermission scope="hierarchy" action="read">
                <AssetDetails />
              </RequirePermission>
            }
          />
          <Route
            path="/inventory"
            element={
              <RequirePermission scope="inventory" action="read">
                <Inventory />
              </RequirePermission>
            }
          />
          <Route
            path="/vendors"
            element={
              <RequirePermission scope="inventory" action="read">
                <VendorsPage />
              </RequirePermission>
            }
          />
          <Route path="/reports" element={<Reports />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/documentation" element={<Documentation />} />
          <Route path="/departments" element={<Departments />} />
          <Route path="/lines" element={<Lines />} />
          <Route path="/stations" element={<Stations />} />
          <Route path="/teams" element={<Teams />} />
          <Route path="/plants" element={<Plants />} />
          <Route path="/technician" element={<TechnicianConsole />} />
          <Route path="/team-members/:teamMemberId" element={<TeamMemberProfile />} />
          <Route
            path="/pm/scheduler"
            element={
              <RequirePermission scope="pm" action="read">
                <PMScheduler />
              </RequirePermission>
            }
          />
          <Route
            path="/pm/tasks"
            element={
              <RequirePermission scope="pm" action="read">
                <PMTasksPage />
              </RequirePermission>
            }
          />
          <Route path="/timesheets" element={<TimeSheets />} />
          <Route path="/admin/tenants" element={<AdminTenants />} />
          <Route
            path="/imports"
            element={
              <RequirePermission scope="importExport" action="import">
                <Imports />
              </RequirePermission>
            }
          />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}
