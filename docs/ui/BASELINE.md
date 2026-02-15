# WorkPro3 UI Baseline

Date: 2026-02-15
Owner: Frontend UI Upgrade pass

## Current stack
- Framework: React 18 + TypeScript + Vite
- Styling: Tailwind v4 utility classes + custom CSS variables in `frontend/src/index.css`
- Component libs in use:
  - Mantine (`@mantine/core`) for provider/theming support
  - Custom components in `frontend/src/components/*`
  - Lucide icons
- State and app settings:
  - Zustand stores (`settingsStore`, `navigationStore`, etc.)
  - React Query (`react-query`) for data fetching

## Existing shell/layout components
- Primary shell entry: `frontend/src/components/layout/Layout.tsx`
- Sidebar: `frontend/src/components/layout/Sidebar.tsx`
- Header: `frontend/src/components/layout/Header.tsx`
- Breadcrumbs: `frontend/src/components/layout/ContextBreadcrumbs.tsx`
- Right utilities panel: `frontend/src/components/layout/RightPanel.tsx`

## Route baseline (major pages)
Defined in `frontend/src/App.tsx`.

Core operations:
- `/dashboard` -> `Dashboard`
- `/work-orders` -> `WorkOrders`
- `/assets` -> `AssetsPage`
- `/maintenance` -> `Maintenance`
- `/permits` -> `PermitsPage`

Analytics:
- `/analytics`
- `/analytics/maintenance`
- `/analytics/operations`
- `/analytics/pm`
- `/analytics/global`

Inventory/Purchasing:
- `/inventory`, `/inventory/parts`, `/inventory/locations`
- `/vendors`
- `/purchasing/purchase-orders`

Admin/Settings:
- `/settings`, `/settings/roles`, `/admin/audit`, `/admin/workflow`

## Component usage baseline (target pages)
- Dashboard:
  - `AlertBanner`, `OnboardingWizard`, `HelpCenterViewer`, `DashboardAnalyticsPanel`, custom KPI cards
- Work Orders:
  - `WorkOrderQueuePanel`, `DataTable`, `TableLayoutControls`, `NewWorkOrderModal`, `WorkOrderReviewModal`
- Assets:
  - `AssetTable`, `AssetModal`, `WorkOrderModal`, inline filter cards and stat blocks

## Known UI issues before upgrade
- Visual inconsistency:
  - Mixed color systems across pages (dark-only sections vs neutral/light cards)
  - Inconsistent border radius/shadow scale and spacing rhythm
- Accessibility/readability:
  - Several pages have low-contrast text in cards/forms
  - Focus states not consistently visible on custom controls
- Layout behavior:
  - Sidebar is desktop-only and not fully functional as a mobile drawer
  - Header and page chrome vary across pages
- Reusability gaps:
  - Repeated ad-hoc filters/cards/table wrappers
  - No dedicated semantic token system for component-level color usage

## Screenshot notes (baseline)
Screenshots were not generated in this environment. Baseline visual state is described from current page implementations and prior QA snapshots.
