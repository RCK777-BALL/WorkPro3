# Frontend Page Audit

Generated on 2026-02-15T11:12:12.149Z using scripts/generate-page-audit.mjs.

This report lists every component in `src/pages` and shows the heuristically matched tests under `src/test`.
Counts for API calls, forms, tables, dialogs, and charts are based on simple string searches to highlight complexity hotspots.

| Page | Lines | API Calls | useForm | Tables | Dialogs | Charts | TODO/FIXME | Candidate Tests |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| [AIDashboard.tsx](frontend/src/pages/AIDashboard.tsx) | 85 | 1 | 0 | 0 | 0 | 0 | 0 | — |
| [AddAssetsToStationsGuide.tsx](frontend/src/pages/AddAssetsToStationsGuide.tsx) | 243 | 0 | 0 | 0 | 0 | 0 | 0 | — |
| [AdminTenants.tsx](frontend/src/pages/AdminTenants.tsx) | 134 | 4 | 0 | 0 | 0 | 0 | 0 | — |
| [Analytics.tsx](frontend/src/pages/Analytics.tsx) | 229 | 3 | 0 | 0 | 0 | 8 | 0 | [analyticsCharts.test.tsx](frontend/src/test/analyticsCharts.test.tsx) |
| [AnalyticsDashboardV2.tsx](frontend/src/pages/AnalyticsDashboardV2.tsx) | 401 | 0 | 0 | 2 | 0 | 0 | 0 | — |
| [AnalyticsMaintenanceDashboard.tsx](frontend/src/pages/AnalyticsMaintenanceDashboard.tsx) | 10 | 0 | 0 | 0 | 0 | 0 | 0 | [maintenance.test.tsx](frontend/src/test/maintenance.test.tsx) |
| [AnalyticsWarehouse.tsx](frontend/src/pages/AnalyticsWarehouse.tsx) | 15 | 0 | 0 | 0 | 0 | 0 | 0 | — |
| [AssetDetails.tsx](frontend/src/pages/AssetDetails.tsx) | 260 | 0 | 0 | 3 | 0 | 3 | 0 | — |
| [AssetManagementAssetsGuide.tsx](frontend/src/pages/AssetManagementAssetsGuide.tsx) | 365 | 1 | 0 | 0 | 0 | 0 | 0 | — |
| [AssetManagementGuide.tsx](frontend/src/pages/AssetManagementGuide.tsx) | 130 | 0 | 0 | 0 | 0 | 0 | 0 | — |
| [AssetScan.tsx](frontend/src/pages/AssetScan.tsx) | 191 | 2 | 0 | 0 | 0 | 0 | 0 | — |
| [AssetsPage.tsx](frontend/src/pages/AssetsPage.tsx) | 837 | 5 | 0 | 3 | 0 | 0 | 0 | — |
| [Dashboard.tsx](frontend/src/pages/Dashboard.tsx) | 1540 | 9 | 0 | 0 | 0 | 0 | 0 | — |
| [Departments.tsx](frontend/src/pages/Departments.tsx) | 1016 | 0 | 0 | 3 | 0 | 0 | 0 | — |
| [Documentation.tsx](frontend/src/pages/Documentation.tsx) | 598 | 4 | 0 | 0 | 0 | 0 | 0 | — |
| [DowntimeEventsPage.tsx](frontend/src/pages/DowntimeEventsPage.tsx) | 10 | 0 | 0 | 0 | 0 | 0 | 0 | — |
| [DowntimeLogsPage.tsx](frontend/src/pages/DowntimeLogsPage.tsx) | 257 | 0 | 0 | 0 | 0 | 0 | 0 | — |
| [FeatureFlags.tsx](frontend/src/pages/FeatureFlags.tsx) | 204 | 3 | 0 | 0 | 0 | 0 | 0 | — |
| [ForgotPasswordPage.tsx](frontend/src/pages/ForgotPasswordPage.tsx) | 88 | 1 | 0 | 0 | 0 | 0 | 0 | — |
| [GlobalAnalyticsDashboard.tsx](frontend/src/pages/GlobalAnalyticsDashboard.tsx) | 217 | 2 | 0 | 0 | 0 | 3 | 0 | — |
| [Imports.tsx](frontend/src/pages/Imports.tsx) | 21 | 0 | 0 | 0 | 0 | 0 | 0 | — |
| [Inventory.tsx](frontend/src/pages/Inventory.tsx) | 117 | 0 | 0 | 2 | 0 | 0 | 0 | [inventoryBarcode.test.tsx](frontend/src/test/inventoryBarcode.test.tsx) |
| [InventoryAnalytics.tsx](frontend/src/pages/InventoryAnalytics.tsx) | 21 | 0 | 0 | 0 | 0 | 0 | 0 | — |
| [InventoryLocations.tsx](frontend/src/pages/InventoryLocations.tsx) | 596 | 0 | 0 | 2 | 0 | 0 | 0 | — |
| [InventoryParts.tsx](frontend/src/pages/InventoryParts.tsx) | 320 | 0 | 0 | 0 | 0 | 0 | 0 | — |
| [IotMonitoring.tsx](frontend/src/pages/IotMonitoring.tsx) | 523 | 0 | 0 | 0 | 0 | 3 | 0 | — |
| [Lines.tsx](frontend/src/pages/Lines.tsx) | 103 | 1 | 0 | 0 | 0 | 0 | 0 | [offlineSync.test.ts](frontend/src/test/offlineSync.test.ts) |
| [Login.tsx](frontend/src/pages/Login.tsx) | 177 | 0 | 0 | 0 | 0 | 0 | 0 | [loginMfa.test.tsx](frontend/src/test/loginMfa.test.tsx)<br>[loginRoute.test.tsx](frontend/src/test/loginRoute.test.tsx) |
| [Maintenance.tsx](frontend/src/pages/Maintenance.tsx) | 189 | 0 | 0 | 2 | 0 | 0 | 0 | [maintenance.test.tsx](frontend/src/test/maintenance.test.tsx)<br>[maintenancePersistence.test.tsx](frontend/src/test/maintenancePersistence.test.tsx) |
| [ManageAssets.tsx](frontend/src/pages/ManageAssets.tsx) | 418 | 4 | 0 | 3 | 0 | 0 | 0 | — |
| [Messages.tsx](frontend/src/pages/Messages.tsx) | 460 | 0 | 0 | 0 | 0 | 0 | 0 | — |
| [NewDepartmentPage.tsx](frontend/src/pages/NewDepartmentPage.tsx) | 27 | 0 | 0 | 0 | 0 | 0 | 0 | — |
| [NotFound.tsx](frontend/src/pages/NotFound.tsx) | 14 | 0 | 0 | 0 | 0 | 0 | 0 | — |
| [NotificationSettings.tsx](frontend/src/pages/NotificationSettings.tsx) | 6 | 0 | 0 | 0 | 0 | 0 | 0 | [settings.test.tsx](frontend/src/test/settings.test.tsx) |
| [Notifications.tsx](frontend/src/pages/Notifications.tsx) | 6 | 0 | 0 | 0 | 0 | 0 | 0 | — |
| [PMAnalytics.tsx](frontend/src/pages/PMAnalytics.tsx) | 176 | 0 | 0 | 0 | 0 | 6 | 0 | — |
| [PMProcedureTemplates.tsx](frontend/src/pages/PMProcedureTemplates.tsx) | 10 | 0 | 0 | 0 | 0 | 0 | 0 | — |
| [PMScheduler.tsx](frontend/src/pages/PMScheduler.tsx) | 37 | 1 | 0 | 0 | 0 | 0 | 0 | [pmScheduler.e2e.test.ts](frontend/src/test/pmScheduler.e2e.test.ts) |
| [PMTasksPage.tsx](frontend/src/pages/PMTasksPage.tsx) | 13 | 0 | 0 | 0 | 0 | 0 | 0 | — |
| [PMTemplateEditor.tsx](frontend/src/pages/PMTemplateEditor.tsx) | 195 | 0 | 0 | 0 | 0 | 0 | 0 | — |
| [PMTemplateList.tsx](frontend/src/pages/PMTemplateList.tsx) | 165 | 0 | 0 | 0 | 0 | 0 | 0 | — |
| [PermitsPage.tsx](frontend/src/pages/PermitsPage.tsx) | 639 | 4 | 0 | 0 | 0 | 0 | 0 | — |
| [Plants.tsx](frontend/src/pages/Plants.tsx) | 192 | 3 | 0 | 0 | 0 | 0 | 0 | — |
| [PwaTechnicianShell.tsx](frontend/src/pages/PwaTechnicianShell.tsx) | 355 | 1 | 0 | 0 | 0 | 0 | 0 | — |
| [RegisterPage.tsx](frontend/src/pages/RegisterPage.tsx) | 146 | 1 | 0 | 0 | 0 | 0 | 0 | — |
| [ReorderAlerts.tsx](frontend/src/pages/ReorderAlerts.tsx) | 161 | 0 | 0 | 0 | 0 | 0 | 0 | — |
| [Reports.tsx](frontend/src/pages/Reports.tsx) | 778 | 6 | 0 | 0 | 0 | 6 | 0 | [reportsKpi.test.tsx](frontend/src/test/reportsKpi.test.tsx) |
| [RequestFormBuilder.tsx](frontend/src/pages/RequestFormBuilder.tsx) | 397 | 0 | 0 | 0 | 0 | 0 | 0 | — |
| [RequestPortal.tsx](frontend/src/pages/RequestPortal.tsx) | 97 | 0 | 0 | 0 | 0 | 0 | 0 | — |
| [RequestStatus.tsx](frontend/src/pages/RequestStatus.tsx) | 60 | 0 | 0 | 0 | 0 | 0 | 0 | — |
| [RoleManagement.tsx](frontend/src/pages/RoleManagement.tsx) | 389 | 4 | 0 | 0 | 0 | 0 | 0 | — |
| [Settings.tsx](frontend/src/pages/Settings.tsx) | 989 | 5 | 0 | 0 | 0 | 0 | 0 | [settings.test.tsx](frontend/src/test/settings.test.tsx) |
| [Stations.tsx](frontend/src/pages/Stations.tsx) | 103 | 1 | 0 | 0 | 0 | 0 | 0 | — |
| [TeamMemberProfile.tsx](frontend/src/pages/TeamMemberProfile.tsx) | 264 | 1 | 0 | 0 | 0 | 0 | 0 | — |
| [Teams.tsx](frontend/src/pages/Teams.tsx) | 84 | 0 | 0 | 3 | 0 | 0 | 0 | — |
| [TechnicianConsole.tsx](frontend/src/pages/TechnicianConsole.tsx) | 10 | 0 | 0 | 0 | 0 | 0 | 0 | — |
| [TimeSheets.tsx](frontend/src/pages/TimeSheets.tsx) | 201 | 4 | 0 | 0 | 0 | 0 | 0 | [timesheets.e2e.test.ts](frontend/src/test/timesheets.e2e.test.ts) |
| [VendorsPage.tsx](frontend/src/pages/VendorsPage.tsx) | 102 | 0 | 0 | 3 | 0 | 0 | 0 | [vendorsPage.test.tsx](frontend/src/test/vendorsPage.test.tsx) |
| [WorkOrderChecklistEditor.tsx](frontend/src/pages/WorkOrderChecklistEditor.tsx) | 81 | 0 | 0 | 0 | 0 | 0 | 0 | — |
| [WorkOrders.tsx](frontend/src/pages/WorkOrders.tsx) | 908 | 10 | 0 | 9 | 0 | 0 | 0 | [offlineWorkOrderSync.test.ts](frontend/src/test/offlineWorkOrderSync.test.ts) |
| [WorkRequestDashboard.tsx](frontend/src/pages/WorkRequestDashboard.tsx) | 227 | 0 | 0 | 0 | 0 | 0 | 0 | — |
| [WorkflowRulesAdmin.tsx](frontend/src/pages/WorkflowRulesAdmin.tsx) | 234 | 0 | 0 | 0 | 0 | 0 | 0 | — |
| [DashboardHome.tsx](frontend/src/pages/dashboard/DashboardHome.tsx) | 400 | 3 | 0 | 0 | 0 | 6 | 0 | — |
| [DashboardLayout.tsx](frontend/src/pages/dashboard/DashboardLayout.tsx) | 22 | 0 | 0 | 0 | 0 | 0 | 0 | — |
| [KpiDashboardWidget.tsx](frontend/src/pages/dashboard/widgets/KpiDashboardWidget.tsx) | 346 | 4 | 0 | 0 | 0 | 11 | 0 | — |
| [LowStockSummaryWidget.test.tsx](frontend/src/pages/dashboard/widgets/LowStockSummaryWidget.test.tsx) | 68 | 0 | 0 | 0 | 0 | 0 | 0 | — |
| [LowStockSummaryWidget.tsx](frontend/src/pages/dashboard/widgets/LowStockSummaryWidget.tsx) | 147 | 0 | 0 | 0 | 0 | 0 | 0 | — |
| [ApiKeysPage.tsx](frontend/src/pages/integrations/ApiKeysPage.tsx) | 20 | 0 | 0 | 0 | 0 | 0 | 0 | — |
| [ExportsPage.tsx](frontend/src/pages/integrations/ExportsPage.tsx) | 20 | 0 | 0 | 0 | 0 | 0 | 0 | — |
| [WebhooksPage.tsx](frontend/src/pages/integrations/WebhooksPage.tsx) | 20 | 0 | 0 | 0 | 0 | 0 | 0 | — |
| [InventoryList.tsx](frontend/src/pages/inventory/InventoryList.tsx) | 180 | 0 | 0 | 0 | 0 | 0 | 0 | — |
| [InventoryPartDetail.tsx](frontend/src/pages/inventory/InventoryPartDetail.tsx) | 360 | 0 | 0 | 0 | 0 | 0 | 0 | — |
| [InventoryViews.test.tsx](frontend/src/pages/inventory/InventoryViews.test.tsx) | 119 | 0 | 0 | 0 | 0 | 0 | 0 | — |
| [ReorderAlertsPage.tsx](frontend/src/pages/inventory/ReorderAlertsPage.tsx) | 10 | 0 | 0 | 0 | 0 | 0 | 0 | — |
| [MobileWorkOrder.tsx](frontend/src/pages/mobile/MobileWorkOrder.tsx) | 293 | 3 | 0 | 0 | 0 | 0 | 0 | — |
| [Inbox.tsx](frontend/src/pages/notifications/Inbox.tsx) | 488 | 1 | 0 | 0 | 0 | 0 | 0 | — |
| [Settings.tsx](frontend/src/pages/notifications/Settings.tsx) | 428 | 0 | 0 | 0 | 0 | 0 | 0 | [settings.test.tsx](frontend/src/test/settings.test.tsx) |
| [PurchaseOrderDetailPage.tsx](frontend/src/pages/purchasing/PurchaseOrderDetailPage.tsx) | 327 | 0 | 0 | 4 | 0 | 0 | 0 | — |
| [PurchaseOrderListPage.tsx](frontend/src/pages/purchasing/PurchaseOrderListPage.tsx) | 147 | 0 | 0 | 3 | 0 | 0 | 0 | — |
| [PurchaseOrderReceivingPage.tsx](frontend/src/pages/purchasing/PurchaseOrderReceivingPage.tsx) | 95 | 0 | 0 | 0 | 0 | 0 | 0 | — |
| [ReceiveModal.tsx](frontend/src/pages/purchasing/ReceiveModal.tsx) | 89 | 0 | 0 | 0 | 0 | 0 | 0 | — |
| [RequestTriage.tsx](frontend/src/pages/requests/RequestTriage.tsx) | 631 | 0 | 0 | 0 | 0 | 0 | 0 | — |
| [SubmitRequest.tsx](frontend/src/pages/requests/SubmitRequest.tsx) | 199 | 1 | 0 | 0 | 0 | 0 | 0 | — |
| [ThemePreferencesCard.tsx](frontend/src/pages/settings/ThemePreferencesCard.tsx) | 231 | 0 | 0 | 0 | 0 | 0 | 0 | — |
| [VendorEditor.tsx](frontend/src/pages/vendors/VendorEditor.tsx) | 309 | 0 | 0 | 3 | 0 | 0 | 0 | — |
| [VendorList.tsx](frontend/src/pages/vendors/VendorList.tsx) | 56 | 0 | 0 | 35 | 0 | 0 | 0 | — |
| [VendorModal.tsx](frontend/src/pages/vendors/VendorModal.tsx) | 155 | 0 | 0 | 0 | 0 | 0 | 0 | [vendorModal.test.tsx](frontend/src/test/vendorModal.test.tsx) |
| [WorkOrderDetail.tsx](frontend/src/pages/workorders/WorkOrderDetail.tsx) | 890 | 3 | 0 | 0 | 0 | 0 | 0 | — |

## Pages Without Direct Test Matches

- frontend/src/pages/AIDashboard.tsx
- frontend/src/pages/AddAssetsToStationsGuide.tsx
- frontend/src/pages/AdminTenants.tsx
- frontend/src/pages/AnalyticsDashboardV2.tsx
- frontend/src/pages/AnalyticsWarehouse.tsx
- frontend/src/pages/AssetDetails.tsx
- frontend/src/pages/AssetManagementAssetsGuide.tsx
- frontend/src/pages/AssetManagementGuide.tsx
- frontend/src/pages/AssetScan.tsx
- frontend/src/pages/AssetsPage.tsx
- frontend/src/pages/Dashboard.tsx
- frontend/src/pages/Departments.tsx
- frontend/src/pages/Documentation.tsx
- frontend/src/pages/DowntimeEventsPage.tsx
- frontend/src/pages/DowntimeLogsPage.tsx
- frontend/src/pages/FeatureFlags.tsx
- frontend/src/pages/ForgotPasswordPage.tsx
- frontend/src/pages/GlobalAnalyticsDashboard.tsx
- frontend/src/pages/Imports.tsx
- frontend/src/pages/InventoryAnalytics.tsx
- frontend/src/pages/InventoryLocations.tsx
- frontend/src/pages/InventoryParts.tsx
- frontend/src/pages/IotMonitoring.tsx
- frontend/src/pages/ManageAssets.tsx
- frontend/src/pages/Messages.tsx
- frontend/src/pages/NewDepartmentPage.tsx
- frontend/src/pages/NotFound.tsx
- frontend/src/pages/Notifications.tsx
- frontend/src/pages/PMAnalytics.tsx
- frontend/src/pages/PMProcedureTemplates.tsx
- frontend/src/pages/PMTasksPage.tsx
- frontend/src/pages/PMTemplateEditor.tsx
- frontend/src/pages/PMTemplateList.tsx
- frontend/src/pages/PermitsPage.tsx
- frontend/src/pages/Plants.tsx
- frontend/src/pages/PwaTechnicianShell.tsx
- frontend/src/pages/RegisterPage.tsx
- frontend/src/pages/ReorderAlerts.tsx
- frontend/src/pages/RequestFormBuilder.tsx
- frontend/src/pages/RequestPortal.tsx
- frontend/src/pages/RequestStatus.tsx
- frontend/src/pages/RoleManagement.tsx
- frontend/src/pages/Stations.tsx
- frontend/src/pages/TeamMemberProfile.tsx
- frontend/src/pages/Teams.tsx
- frontend/src/pages/TechnicianConsole.tsx
- frontend/src/pages/WorkOrderChecklistEditor.tsx
- frontend/src/pages/WorkRequestDashboard.tsx
- frontend/src/pages/WorkflowRulesAdmin.tsx
- frontend/src/pages/dashboard/DashboardHome.tsx
- frontend/src/pages/dashboard/DashboardLayout.tsx
- frontend/src/pages/dashboard/widgets/KpiDashboardWidget.tsx
- frontend/src/pages/dashboard/widgets/LowStockSummaryWidget.test.tsx
- frontend/src/pages/dashboard/widgets/LowStockSummaryWidget.tsx
- frontend/src/pages/integrations/ApiKeysPage.tsx
- frontend/src/pages/integrations/ExportsPage.tsx
- frontend/src/pages/integrations/WebhooksPage.tsx
- frontend/src/pages/inventory/InventoryList.tsx
- frontend/src/pages/inventory/InventoryPartDetail.tsx
- frontend/src/pages/inventory/InventoryViews.test.tsx
- frontend/src/pages/inventory/ReorderAlertsPage.tsx
- frontend/src/pages/mobile/MobileWorkOrder.tsx
- frontend/src/pages/notifications/Inbox.tsx
- frontend/src/pages/purchasing/PurchaseOrderDetailPage.tsx
- frontend/src/pages/purchasing/PurchaseOrderListPage.tsx
- frontend/src/pages/purchasing/PurchaseOrderReceivingPage.tsx
- frontend/src/pages/purchasing/ReceiveModal.tsx
- frontend/src/pages/requests/RequestTriage.tsx
- frontend/src/pages/requests/SubmitRequest.tsx
- frontend/src/pages/settings/ThemePreferencesCard.tsx
- frontend/src/pages/vendors/VendorEditor.tsx
- frontend/src/pages/vendors/VendorList.tsx
- frontend/src/pages/workorders/WorkOrderDetail.tsx

## Notes

- The heuristic considers only file names. Some components may still be covered indirectly by integration or end-to-end tests.
- Consider adding explicit tests for pages listed above to ensure critical user flows remain protected.
