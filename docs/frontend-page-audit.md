# Frontend Page Audit

Generated on 2025-10-13T07:02:23.228Z using scripts/generate-page-audit.mjs.

This report lists every component in `src/pages` and shows the heuristically matched tests under `src/test`.
Counts for API calls, forms, tables, dialogs, and charts are based on simple string searches to highlight complexity hotspots.

| Page | Lines | API Calls | useForm | Tables | Dialogs | Charts | TODO/FIXME | Candidate Tests |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| [AdminTenants.tsx](frontend/src/pages/AdminTenants.tsx) | 134 | 4 | 0 | 0 | 0 | 0 | 0 | — |
| [Analytics.tsx](frontend/src/pages/Analytics.tsx) | 128 | 3 | 0 | 0 | 0 | 8 | 0 | [analyticsCharts.test.tsx](frontend/src/test/analyticsCharts.test.tsx) |
| [AssetDetails.tsx](frontend/src/pages/AssetDetails.tsx) | 18 | 0 | 0 | 0 | 0 | 0 | 0 | — |
| [AssetScan.tsx](frontend/src/pages/AssetScan.tsx) | 15 | 0 | 0 | 0 | 0 | 0 | 0 | — |
| [Assets.tsx](frontend/src/pages/Assets.tsx) | 152 | 2 | 0 | 0 | 0 | 0 | 0 | — |
| [AssetsPage.tsx](frontend/src/pages/AssetsPage.tsx) | 198 | 5 | 0 | 3 | 0 | 0 | 0 | — |
| [Dashboard.tsx](frontend/src/pages/Dashboard.tsx) | 174 | 4 | 0 | 0 | 0 | 0 | 0 | [dashboardKpis.test.tsx](frontend/src/test/dashboardKpis.test.tsx) |
| [Departments.tsx](frontend/src/pages/Departments.tsx) | 89 | 0 | 0 | 0 | 0 | 0 | 0 | — |
| [Documentation.tsx](frontend/src/pages/Documentation.tsx) | 272 | 0 | 0 | 0 | 0 | 0 | 0 | — |
| [ForgotPasswordPage.tsx](frontend/src/pages/ForgotPasswordPage.tsx) | 88 | 1 | 0 | 0 | 0 | 0 | 0 | — |
| [Imports.tsx](frontend/src/pages/Imports.tsx) | 57 | 1 | 0 | 0 | 0 | 0 | 0 | — |
| [Inventory.tsx](frontend/src/pages/Inventory.tsx) | 261 | 5 | 0 | 3 | 0 | 0 | 0 | — |
| [Login.tsx](frontend/src/pages/Login.tsx) | 87 | 0 | 0 | 0 | 0 | 0 | 0 | [loginMfa.test.tsx](frontend/src/test/loginMfa.test.tsx)<br>[loginRoute.test.tsx](frontend/src/test/loginRoute.test.tsx) |
| [Maintenance.tsx](frontend/src/pages/Maintenance.tsx) | 169 | 0 | 0 | 2 | 0 | 0 | 0 | — |
| [Messages.tsx](frontend/src/pages/Messages.tsx) | 325 | 0 | 0 | 0 | 0 | 0 | 0 | — |
| [NewDepartmentPage.tsx](frontend/src/pages/NewDepartmentPage.tsx) | 27 | 0 | 0 | 0 | 0 | 0 | 0 | — |
| [NotFound.tsx](frontend/src/pages/NotFound.tsx) | 14 | 0 | 0 | 0 | 0 | 0 | 0 | — |
| [Notifications.tsx](frontend/src/pages/Notifications.tsx) | 120 | 3 | 0 | 0 | 0 | 0 | 0 | — |
| [PMScheduler.tsx](frontend/src/pages/PMScheduler.tsx) | 37 | 1 | 0 | 0 | 0 | 0 | 0 | [pmScheduler.e2e.test.ts](frontend/src/test/pmScheduler.e2e.test.ts) |
| [PMTasksPage.tsx](frontend/src/pages/PMTasksPage.tsx) | 99 | 1 | 0 | 0 | 0 | 0 | 0 | — |
| [RegisterPage.tsx](frontend/src/pages/RegisterPage.tsx) | 146 | 1 | 0 | 0 | 0 | 0 | 0 | — |
| [Reports.tsx](frontend/src/pages/Reports.tsx) | 438 | 2 | 0 | 0 | 0 | 3 | 0 | [reportsKpi.test.tsx](frontend/src/test/reportsKpi.test.tsx) |
| [RequestWork.tsx](frontend/src/pages/RequestWork.tsx) | 128 | 2 | 0 | 0 | 0 | 0 | 0 | [requestWork.test.tsx](frontend/src/test/requestWork.test.tsx) |
| [SafetyPermits.tsx](frontend/src/pages/SafetyPermits.tsx) | 450 | 8 | 0 | 0 | 0 | 0 | 0 | — |
| [Settings.tsx](frontend/src/pages/Settings.tsx) | 289 | 1 | 0 | 0 | 0 | 0 | 0 | [settings.test.tsx](frontend/src/test/settings.test.tsx) |
| [TeamMemberProfile.tsx](frontend/src/pages/TeamMemberProfile.tsx) | 202 | 1 | 0 | 0 | 0 | 0 | 0 | — |
| [Teams.tsx](frontend/src/pages/Teams.tsx) | 62 | 0 | 0 | 3 | 0 | 0 | 0 | — |
| [TimeSheets.tsx](frontend/src/pages/TimeSheets.tsx) | 201 | 4 | 0 | 0 | 0 | 0 | 0 | [timesheets.e2e.test.ts](frontend/src/test/timesheets.e2e.test.ts) |
| [VendorsPage.tsx](frontend/src/pages/VendorsPage.tsx) | 107 | 4 | 0 | 3 | 0 | 0 | 0 | [vendorsPage.test.tsx](frontend/src/test/vendorsPage.test.tsx) |
| [WorkOrders.tsx](frontend/src/pages/WorkOrders.tsx) | 413 | 6 | 0 | 3 | 0 | 0 | 0 | — |
| [DashboardHome.tsx](frontend/src/pages/dashboard/DashboardHome.tsx) | 366 | 3 | 0 | 0 | 0 | 6 | 0 | — |
| [DashboardLayout.tsx](frontend/src/pages/dashboard/DashboardLayout.tsx) | 22 | 0 | 0 | 0 | 0 | 0 | 0 | — |

## Pages Without Direct Test Matches

- frontend/src/pages/AdminTenants.tsx
- frontend/src/pages/AssetDetails.tsx
- frontend/src/pages/AssetScan.tsx
- frontend/src/pages/Assets.tsx
- frontend/src/pages/AssetsPage.tsx
- frontend/src/pages/Departments.tsx
- frontend/src/pages/Documentation.tsx
- frontend/src/pages/ForgotPasswordPage.tsx
- frontend/src/pages/Imports.tsx
- frontend/src/pages/Inventory.tsx
- frontend/src/pages/Maintenance.tsx
- frontend/src/pages/Messages.tsx
- frontend/src/pages/NewDepartmentPage.tsx
- frontend/src/pages/NotFound.tsx
- frontend/src/pages/Notifications.tsx
- frontend/src/pages/PMTasksPage.tsx
- frontend/src/pages/RegisterPage.tsx
- frontend/src/pages/SafetyPermits.tsx
- frontend/src/pages/TeamMemberProfile.tsx
- frontend/src/pages/Teams.tsx
- frontend/src/pages/WorkOrders.tsx
- frontend/src/pages/dashboard/DashboardHome.tsx
- frontend/src/pages/dashboard/DashboardLayout.tsx

## Notes

- The heuristic considers only file names. Some components may still be covered indirectly by integration or end-to-end tests.
- Consider adding explicit tests for pages listed above to ensure critical user flows remain protected.
