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
import AnalyticsDashboardV2 from "@/pages/AnalyticsDashboardV2";
import AnalyticsWarehousePage from "@/pages/AnalyticsWarehouse";
import AnalyticsMaintenanceDashboard from "@/pages/AnalyticsMaintenanceDashboard";
import WorkOrders from "@/pages/WorkOrders";
import WorkOrderDetail from "@/pages/workorders/WorkOrderDetail";
import WorkRequestDashboard from "@/pages/WorkRequestDashboard";
import Maintenance from "@/pages/Maintenance";
import AssetsPage from "@/pages/AssetsPage";
import AssetDetails from "@/pages/AssetDetails";
import Inventory from "@/pages/Inventory";
import InventoryLocations from "@/pages/InventoryLocations";
import InventoryParts from "@/pages/InventoryParts";
import InventoryList from "@/pages/inventory/InventoryList";
import InventoryPartDetail from "@/pages/inventory/InventoryPartDetail";
import InventoryAnalytics from "@/pages/InventoryAnalytics";
import IotMonitoring from "@/pages/IotMonitoring";
import VendorsPage from "@/pages/VendorsPage";
import VendorEditor from "@/pages/vendors/VendorEditor";
import PurchaseOrderListPage from "@/pages/purchasing/PurchaseOrderListPage";
import PurchaseOrderDetailPage from "@/pages/purchasing/PurchaseOrderDetailPage";
import PurchaseOrderReceivingPage from "@/pages/purchasing/PurchaseOrderReceivingPage";
import Reports from "@/pages/Reports";
import Notifications from "@/pages/Notifications";
import NotificationSettings from "@/pages/NotificationSettings";
import DowntimeLogsPage from "@/pages/DowntimeLogsPage";
import DowntimeEventsPage from "@/pages/DowntimeEventsPage";
import WorkflowRulesAdmin from "@/pages/WorkflowRulesAdmin";
import Messages from "@/pages/Messages";
import RoleManagementPage from "@/pages/RoleManagement";
import FeatureFlagsPage from "@/pages/FeatureFlags";
import Documentation from "@/pages/Documentation";
import AssetManagementGuide from "@/pages/AssetManagementGuide";
import AssetManagementAssetsGuide from "@/pages/AssetManagementAssetsGuide";
import AddAssetsToStationsGuide from "@/pages/AddAssetsToStationsGuide";
import ManageAssets from "@/pages/ManageAssets";
import Departments from "@/pages/Departments";
import Lines from "@/pages/Lines";
import Stations from "@/pages/Stations";
import Teams from "@/pages/Teams";
import { AssetExplorerPage } from "@/features/assets";
import { AuditLogsPage } from "@/features/audit";
import { ExecutiveInsightsPage } from "@/features/executive";
import PermitsPage from "@/pages/PermitsPage";
import TeamMemberProfile from "@/pages/TeamMemberProfile";
import Settings from "@/pages/Settings";
import TimeSheets from "@/pages/TimeSheets";
import PMScheduler from "@/pages/PMScheduler";
import PMTasksPage from "@/pages/PMTasksPage";
import PMTemplateList from "@/pages/PMTemplateList";
import PMTemplateEditor from "@/pages/PMTemplateEditor";
import PMProcedureTemplates from "@/pages/PMProcedureTemplates";
import Calibration from "@/pages/Calibration";
import AdminTenants from "@/pages/AdminTenants";
import Imports from "@/pages/Imports";
import ApiKeysPage from "@/pages/integrations/ApiKeysPage";
import ExportsPage from "@/pages/integrations/ExportsPage";
import WebhooksPage from "@/pages/integrations/WebhooksPage";
import Plants from "@/pages/Plants";
import GlobalAnalyticsDashboard from "@/pages/GlobalAnalyticsDashboard";
import AIDashboard from "@/pages/AIDashboard";
import TechnicianConsole from "@/pages/TechnicianConsole";
import Login from "@/pages/Login";
import PMAnalytics from "@/pages/PMAnalytics";
import RegisterPage from "@/pages/RegisterPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import BootstrapSetupPage from "@/modules/admin/setup";
import { safeLocalStorage } from "@/utils/safeLocalStorage";
import PublicRequestPage from "@/public/request";
import RequestStatus from "@/pages/RequestStatus";
import SubmitRequest from "@/pages/requests/SubmitRequest";
import RequestTriage from "@/pages/requests/RequestTriage";
import AssetScan from "@/pages/AssetScan";
import MobileWorkOrder from "@/pages/mobile/MobileWorkOrder";
import PwaTechnicianShell from "@/pages/PwaTechnicianShell";
import MobileStrategy from "@/pages/MobileStrategy";
import RequestFormBuilder from "@/pages/RequestFormBuilder";
import ReorderAlerts from "@/pages/ReorderAlerts";
import ConditionAutomation from "@/pages/ConditionAutomation";
import DispatchBoard from "@/pages/DispatchBoard";
import ScanDeepLink from "@/routes/ScanDeepLink";
import UiPlayground from "@/pages/UiPlayground";

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
        <Route path="/admin/setup" element={<BootstrapSetupPage />} />
        <Route path="/public/request/:slug?" element={<PublicRequestPage />} />
        <Route path="/request/:token" element={<RequestStatus />} />
        <Route element={<RequireAuth><Layout /></RequireAuth>}>
          <Route index element={<Navigate to="/dashboard" />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/analytics/maintenance" element={<AnalyticsMaintenanceDashboard />} />
          <Route path="/analytics/dashboard/v2" element={<AnalyticsDashboardV2 />} />
          <Route path="/analytics/operations" element={<AnalyticsWarehousePage />} />
          <Route path="/analytics/pm" element={<PMAnalytics />} />
          <Route path="/analytics/global" element={<GlobalAnalyticsDashboard />} />
          <Route
            path="/downtime"
            element={
              <RequirePermission permission="workOrders.read">
                <DowntimeLogsPage />
              </RequirePermission>
            }
          />
          <Route
            path="/downtime/events"
            element={
              <RequirePermission permission="workOrders.read">
                <DowntimeEventsPage />
              </RequirePermission>
            }
          />
          <Route path="/analytics/ai" element={<AIDashboard />} />
          <Route
            path="/executive"
            element={
              <RequirePermission permission="executive.read">
                <ExecutiveInsightsPage />
              </RequirePermission>
            }
          />
          <Route path="/iot" element={<IotMonitoring />} />
          <Route path="/work-orders" element={<WorkOrders />} />
          <Route path="/workorders" element={<WorkOrders />} />
          <Route path="/workorders/:id" element={<WorkOrderDetail />} />
          <Route path="/work-orders/:id" element={<WorkOrderDetail />} />
          <Route path="/m/wo/:id" element={<MobileWorkOrder />} />
          <Route
            path="/work-requests"
            element={
              <RequirePermission permission="workRequests.read">
                <WorkRequestDashboard />
              </RequirePermission>
            }
          />
          <Route
            path="/requests/submit"
            element={
              <RequirePermission permission="workRequests.read">
                <SubmitRequest />
              </RequirePermission>
            }
          />
          <Route
            path="/requests/triage"
            element={
              <RequirePermission permission="workRequests.read">
                <RequestTriage />
              </RequirePermission>
            }
          />
          <Route
            path="/requests/forms"
            element={
              <RequirePermission permission="workRequests.convert">
                <RequestFormBuilder />
              </RequirePermission>
            }
          />
          <Route path="/maintenance" element={<Maintenance />} />
          <Route path="/permits" element={<PermitsPage />} />
          <Route
            path="/settings/roles"
            element={
              <RequirePermission permission="roles.read">
                <RoleManagementPage />
              </RequirePermission>
            }
          />
          <Route
            path="/assets"
            element={
              <RequirePermission permission="hierarchy.read">
                <AssetsPage />
              </RequirePermission>
            }
          />
          <Route
            path="/assets/scan"
            element={
              <RequirePermission permission="hierarchy.read">
                <AssetScan />
              </RequirePermission>
            }
          />
          <Route path="/scan/:type/:id" element={<ScanDeepLink />} />
          <Route
            path="/assets/manage"
            element={
              <RequirePermission permission="hierarchy.read">
                <ManageAssets />
              </RequirePermission>
            }
          />
          <Route
            path="/assets/explorer"
            element={
              <RequirePermission permission="hierarchy.read">
                <AssetExplorerPage />
              </RequirePermission>
            }
          />
          <Route
            path="/assets/:assetId"
            element={
              <RequirePermission permission="hierarchy.read">
                <AssetDetails />
              </RequirePermission>
            }
          />
          <Route
            path="/inventory"
            element={
              <RequirePermission permission="inventory.read">
                <Inventory />
              </RequirePermission>
            }
          />
          <Route
            path="/inventory/items"
            element={
              <RequirePermission permission="inventory.read">
                <InventoryList />
              </RequirePermission>
            }
          />
          <Route
            path="/inventory/items/:partId"
            element={
              <RequirePermission permission="inventory.read">
                <InventoryPartDetail />
              </RequirePermission>
            }
          />
          <Route
            path="/inventory/analytics"
            element={
              <RequirePermission permission="inventory.read">
                <InventoryAnalytics />
              </RequirePermission>
            }
          />
          <Route
            path="/inventory/locations"
            element={
              <RequirePermission permission="inventory.read">
                <InventoryLocations />
              </RequirePermission>
            }
          />
          <Route
            path="/inventory/locations/:locationId"
            element={
              <RequirePermission permission="inventory.read">
                <InventoryLocations />
              </RequirePermission>
            }
          />
          <Route
            path="/locations/:locationId"
            element={
              <RequirePermission permission="inventory.read">
                <InventoryLocations />
              </RequirePermission>
            }
          />
          <Route
            path="/inventory/parts"
            element={
              <RequirePermission permission="inventory.read">
                <InventoryParts />
              </RequirePermission>
            }
          />
          <Route
            path="/inventory/alerts"
            element={
              <RequirePermission permission="inventory.read">
                <ReorderAlerts />
              </RequirePermission>
            }
          />
          <Route
            path="/inventory/parts/:partId"
            element={
              <RequirePermission permission="inventory.read">
                <InventoryPartDetail />
              </RequirePermission>
            }
          />
          <Route
            path="/parts/:partId"
            element={
              <RequirePermission permission="inventory.read">
                <InventoryPartDetail />
              </RequirePermission>
            }
          />
          <Route
            path="/vendors"
            element={
              <RequirePermission permission="inventory.read">
                <VendorsPage />
              </RequirePermission>
            }
          />
          <Route
            path="/vendors/new"
            element={
              <RequirePermission permission="inventory.read">
                <VendorEditor />
              </RequirePermission>
            }
          />
          <Route
            path="/vendors/:vendorId"
            element={
              <RequirePermission permission="inventory.read">
                <VendorEditor />
              </RequirePermission>
            }
          />
          <Route
            path="/purchasing/purchase-orders"
            element={
              <RequirePermission permission="inventory.read">
                <PurchaseOrderListPage />
              </RequirePermission>
            }
          />
          <Route
            path="/purchasing/purchase-orders/new"
            element={
              <RequirePermission permission="inventory.read">
                <PurchaseOrderDetailPage />
              </RequirePermission>
            }
          />
          <Route
            path="/purchasing/purchase-orders/:poId"
            element={
              <RequirePermission permission="inventory.read">
                <PurchaseOrderDetailPage />
              </RequirePermission>
            }
          />
          <Route
            path="/purchasing/receiving"
            element={
              <RequirePermission permission="inventory.read">
                <PurchaseOrderReceivingPage />
              </RequirePermission>
            }
          />
          <Route path="/reports" element={<Reports />} />
          <Route path="/notifications/settings" element={<NotificationSettings />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/documentation" element={<Documentation />} />
          <Route path="/documentation/asset-management" element={<AssetManagementGuide />} />
          <Route
            path="/documentation/asset-management/assets"
            element={<AssetManagementAssetsGuide />}
          />
          <Route
            path="/documentation/asset-management/assets/add-to-stations"
            element={<AddAssetsToStationsGuide />}
          />
          <Route
            path="/documentation/asset-management/assets/manage"
            element={<Navigate to="/assets/manage" replace />}
          />
          <Route path="/departments" element={<Departments />} />
          <Route path="/lines" element={<Lines />} />
          <Route path="/stations" element={<Stations />} />
          <Route path="/teams" element={<Teams />} />
          <Route path="/plants" element={<Plants />} />
          <Route path="/technician" element={<TechnicianConsole />} />
          <Route path="/pwa/technician" element={<PwaTechnicianShell />} />
          <Route path="/mobile" element={<MobileStrategy />} />
          <Route path="/team-members/:teamMemberId" element={<TeamMemberProfile />} />
          <Route
            path="/pm/scheduler"
            element={
              <RequirePermission permission="pm.read">
                <PMScheduler />
              </RequirePermission>
            }
          />
          <Route
            path="/pm/templates"
            element={
              <RequirePermission permission="pm.read">
                <PMTemplateList />
              </RequirePermission>
            }
          />
          <Route
            path="/pm/templates/new"
            element={
              <RequirePermission permission="pm.write">
                <PMTemplateEditor />
              </RequirePermission>
            }
          />
          <Route
            path="/pm/templates/:templateId/edit"
            element={
              <RequirePermission permission="pm.write">
                <PMTemplateEditor />
              </RequirePermission>
            }
          />
          <Route
            path="/pm/procedures"
            element={
              <RequirePermission permission="pm.read">
                <PMProcedureTemplates />
              </RequirePermission>
            }
          />
          <Route
            path="/pm/tasks"
            element={
              <RequirePermission permission="pm.read">
                <PMTasksPage />
              </RequirePermission>
            }
          />
          <Route
            path="/calibration"
            element={
              <RequirePermission permission="pm.read">
                <Calibration />
              </RequirePermission>
            }
          />
          <Route
            path="/automation/cbm"
            element={
              <RequirePermission permission="pm.write">
                <ConditionAutomation />
              </RequirePermission>
            }
          />
          <Route
            path="/planning/dispatch"
            element={
              <RequirePermission permission="workorders.read">
                <DispatchBoard />
              </RequirePermission>
            }
          />
          <Route path="/timesheets" element={<TimeSheets />} />
          <Route path="/admin/tenants" element={<AdminTenants />} />
          <Route
            path="/imports"
            element={
              <RequirePermission permission="importExport.import">
                <Imports />
              </RequirePermission>
            }
          />
          <Route
            path="/integrations/api-keys"
            element={
              <RequirePermission permission="integrations.manage">
                <ApiKeysPage />
              </RequirePermission>
            }
          />
          <Route
            path="/integrations/webhooks"
            element={
              <RequirePermission permission="integrations.manage">
                <WebhooksPage />
              </RequirePermission>
            }
          />
          <Route
            path="/integrations/exports"
            element={
              <RequirePermission permission="importExport.export">
                <ExportsPage />
              </RequirePermission>
            }
          />
          <Route
            path="/admin/workflow"
            element={
              <RequirePermission permission="roles.manage">
                <WorkflowRulesAdmin />
              </RequirePermission>
            }
          />
          <Route
            path="/admin/feature-flags"
            element={
              <RequirePermission permission="roles.manage">
                <FeatureFlagsPage />
              </RequirePermission>
            }
          />
          <Route
            path="/admin/audit"
            element={
              <RequirePermission permission="audit.read">
                <AuditLogsPage />
              </RequirePermission>
            }
          />
          <Route path="/settings" element={<Settings />} />
          {import.meta.env.DEV ? <Route path="/ui-playground" element={<UiPlayground />} /> : null}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}
