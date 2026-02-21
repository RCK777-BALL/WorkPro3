# WorkPro3 Implementation Board Tasks

This document breaks the end-to-end implementation board into discrete tasks with clear deliverables. It is intended to be used as a checklist for sequencing work from “feature build” to production-ready.

## EPIC 0 — Repo Baseline & Standards
- **WPB-0001 — Lock repo conventions**
  - Add `/docs/ARCHITECTURE.md` with folder structure and system context.
  - Add `/docs/CONTRIBUTING.md` with local dev + PR checklist.
  - Add `/docs/CODING_STANDARDS.md` with linting, formatting, and naming rules.
- **WPB-0002 — Shared contracts to stop API/TS drift**
  - Create `/shared/validators/*.ts` for DTO validation (Zod optional).
  - Ensure backend + frontend import from `/shared/types` only (no duplicated types).

## EPIC 1 — Production Configuration & Secrets
- **WPB-0101 — Complete env validation (backend)**
  - Add `backend/.env.sample` with required prod vars.
  - Expand `backend/src/config/env.ts` validations.
  - Enforce `JWT_SECRET` length and fail fast.
- **WPB-0102 — Complete env validation (frontend)**
  - Add `frontend/.env.sample` with required `VITE_*` vars.
  - Fail fast in dev when missing.
- **WPB-0103 — Secret management pattern**
  - Add `docs/SECRETS.md` with per-environment guidance.
  - Ensure `k8s/secrets.example.yaml` remains placeholders only.

## EPIC 2 — Security Hardening (Launch-Safe)
- **WPB-0201 — HTTP security middleware**
  - Add `backend/src/config/security.ts`.
  - Wire Helmet + rate limit in `backend/src/app.ts`.
- **WPB-0202 — CORS locked down**
  - Add `backend/src/config/cors.ts`.
  - Restrict origins + socket policy.
- **WPB-0203 — RBAC enforcement server-side**
  - Add `backend/src/policies/permissions.ts`.
  - Add `backend/src/middleware/rbacMiddleware.ts`.
  - Enforce on protected routes.
- **WPB-0204 — Audit log append-only**
  - Add `backend/src/models/AuditLog.ts`.
  - Add `backend/src/services/audit.service.ts`.
  - Add `backend/src/middleware/auditTrail.ts`.
  - Track WO, PM, inventory, role changes.

## EPIC 3 — backend Domain Completion (Top-5 CMMS Core)
### Assets
- **WPB-0301 — Asset model + hierarchy**
  - Add `backend/src/models/Asset.ts`.
  - Add `backend/src/models/Location.ts`.
  - Add `backend/src/models/Attachment.ts`.
- **WPB-0302 — Assets CRUD API**
  - Add routes/controllers/services/validators for assets.
  - Enforce tenant scoping + search + pagination.

### Work Orders
- **WPB-0310 — Work order model + lifecycle**
  - Add `backend/src/models/WorkOrder.ts` with required statuses.
  - Support checklists, labor time, parts, attachments.
- **WPB-0311 — Work orders CRUD API**
  - Add routes/controllers/services/validators for WOs.
  - Support create/assign/update/close + filters + export-ready query.

### Preventive Maintenance (PM)
- **WPB-0320 — PM model**
  - Add `backend/src/models/PreventiveMaintenance.ts`.
- **WPB-0321 — PM CRUD API**
  - Add routes/controllers/services/validators for PM.
- **WPB-0322 — PM → auto generate work orders**
  - Add `backend/src/jobs/pmGenerator.job.ts`, `jobRunner.ts`, `locks.ts`.
  - Ensure idempotency and correct due dates.

### Inventory + Purchasing
- **WPB-0330 — Parts + stock models**
  - Add `backend/src/models/InventoryPart.ts`.
  - Add `backend/src/models/PartStock.ts`.
- **WPB-0331 — Vendors + PO Lite models**
  - Add `backend/src/models/Vendor.ts`.
  - Add `backend/src/models/PurchaseOrder.ts`.
- **WPB-0332 — Receiving endpoint updates stock + audit**
  - Add routes/controllers/services/validators for POs.
  - Prevent over-receipt, update PartStock, log receipts.

## EPIC 4 — frontend Feature Completion (Top-5 UX)
- **WPB-0401 — API client + auth interceptors**
  - Add `frontend/src/api/client.ts` and `/api/endpoints/*.ts`.
- **WPB-0402 — Dashboard KPIs + charts**
  - Add `frontend/src/components/KpiCards.tsx`.
  - Add `backend/src/routes/summary.routes.ts`.
- **WPB-0403 — Assets page + detail view**
  - Add `Assets.tsx`, `AssetDetail.tsx`, `AssetModal.tsx`, `UploadDropzone.tsx`.
- **WPB-0410 — Work Orders list + detail view**
  - Add `WorkOrderDetail.tsx`, `WorkOrderModal.tsx`, `DataTable.tsx`, `FiltersBar.tsx`.
- **WPB-0420 — PM Scheduler UI**
  - Add `PreventiveMaintenance.tsx` and `PMModal.tsx`.
- **WPB-0430 — Inventory + Vendors + PO Lite UI**
  - Add `Vendors.tsx`, `PurchaseOrders.tsx`, `VendorModal.tsx`, `POModal.tsx`.
- **WPB-0440 — Admin: users/roles/permissions**
  - Add `Admin.tsx`, extend `Settings.tsx` role management.

## EPIC 5 — Offline Mode (Enterprise-Grade)
- **WPB-0501 — Offline action queue**
  - Add `/frontend/src/offline/queue.ts`, `sync.ts`, `conflicts.ts`, `ui/SyncStatus.tsx`.
  - Retry/backoff + per-action status.
- **WPB-0502 — Server-side idempotency + sync endpoints**
  - Add `backend/src/models/OfflineAction.ts`.
  - Add `backend/src/routes/sync.routes.ts`, `controllers`, `services`.

## EPIC 6 — Observability & Reliability
- **WPB-0601 — Logging + request IDs**
  - Add `backend/src/config/logger.ts` + `middleware/requestId.ts`.
- **WPB-0602 — Health checks for k8s**
  - Add `backend/src/routes/health.routes.ts`.
- **WPB-0603 — Metrics**
  - Add `backend/src/metrics/metrics.ts` + `routes/metrics.routes.ts`.

## EPIC 7 — CI/CD & Quality Gates
- **WPB-0701 — CI workflow (lint/test/build)**
  - Verify `.github/workflows/ci.yml` stays aligned with lint/test/build gates.
- **WPB-0702 — Docker build + push pipeline**
  - Add `.github/workflows/release.yml`.
  - Ensure `backend/Dockerfile`, `frontend/Dockerfile`, `.dockerignore` are complete.
- **WPB-0703 — Dependency & security scanning**
  - Add `.github/dependabot.yml` for weekly dependency PRs.

## EPIC 8 — Kubernetes “Real Production” Setup
- **WPB-0801 — Ingress + TLS**
  - Confirm `k8s/ingress.yaml` + add `docs/DEPLOYMENT.md` guidance.
- **WPB-0802 — Resource limits + autoscaling**
  - Verify `k8s/hpa.yaml` and `k8s/pdb.yaml` with requests/limits in deployment manifests.
- **WPB-0803 — Mongo production posture**
  - Add `docs/MONGO_PRODUCTION.md`.

## EPIC 9 — Production Documentation & Runbooks
- **WPB-0901 — Deployment runbook**
  - Add `docs/DEPLOYMENT.md` and `docs/RUNBOOK.md`.
- **WPB-0902 — API & permissions documentation**
  - Add `docs/API.md`, `docs/ROLE_PERMISSIONS.md`, `docs/OFFLINE_SYNC.md`.

## EPIC 10 — UX/UI Parity with Top CMMS Layouts
- **WPB-1001 — Design persistent “Create” CTA in header**
  - Define CTA placement, label, and iconography in the header layout.
  - Align CTA styling with existing primary button tokens and dark theme.
  - Document CTA visibility rules for authenticated pages.
- **WPB-1002 — Wire “Create” CTA to work order creation flow**
  - Connect CTA to the existing Work Order create route or modal.
  - Add telemetry/analytics event for CTA usage.
  - Verify permission gating for create actions.
- **WPB-1003 — Validate responsive behavior for header CTA**
  - Confirm CTA remains discoverable on small breakpoints.
  - Add overflow handling in header when switchers or search are present.
  - Update QA checklist for responsive header testing.
- **WPB-1004 — Define right-panel context mapping**
  - Create a route-to-widget mapping for assets, PM, inventory, and work orders.
  - Specify fallback content for routes without a defined panel.
  - Ensure widgets use existing data sources or placeholders.
- **WPB-1005 — Add right-panel collapse/expand control**
  - Add a toggle control in the layout to collapse the right panel.
  - Ensure layout reflows when the panel is hidden.
  - Provide keyboard accessibility for the toggle.
- **WPB-1006 — Persist right-panel visibility preference**
  - Store the panel state in user settings or local storage.
  - Restore visibility on page reload and across sessions.
  - Add default behavior for first-time users.
- **WPB-1007 — Audit and update Operations navigation order**
  - Inventory all Operations links and their current usage frequency.
  - Prioritize Work Orders and Work Requests at the top.
  - Confirm permission gating and badges are unaffected.
- **WPB-1008 — Consolidate Inventory nav structure**
  - Group parts and locations under a single Inventory node.
  - Adjust routes/labels to reduce duplication and scanning time.
  - Update any associated onboarding/help text.
- **WPB-1009 — Validate navigation IA with stakeholders**
  - Run a quick card sort or feedback review with Ops/Dispatcher roles.
  - Capture required tweaks to labels or grouping.
  - Finalize updated navigation order in config.
- **WPB-1010 — Build a shared page header component**
  - Create a reusable header block (title, description, actions, filter summary).
  - Add prop support for secondary actions and status badges.
  - Document usage guidelines for new pages.
- **WPB-1011 — Apply page header to key list pages**
  - Work Orders list: include primary “Create WO” action and filters.
  - Assets list: include add asset action and asset status summary.
  - Inventory/PM list: include filters, export, and quick actions.
- **WPB-1012 — Integrate filter chips into page header**
  - Show active filter chips inline with quick clear/reset actions.
  - Add compact filter summary for dense mode layouts.
  - Ensure chips are accessible and keyboard navigable.
- **WPB-1013 — Define Saved Views/Favorites data model**
  - Specify how favorites and saved views are stored per user.
  - Determine integration with existing navigation ordering store.
  - Add migration plan for legacy favorites if applicable.
- **WPB-1014 — Add “Pinned/Recent” entry point in navigation**
  - Add a top-level sidebar group for favorites/recents.
  - Render recent entities with last-accessed timestamps.
  - Provide quick remove/unpin actions.
- **WPB-1015 — Implement saved view creation UX**
  - Add “Save view” actions on list pages with filters applied.
  - Allow renaming and sharing saved views where permissions allow.
  - Provide a management screen for saved views.
- **WPB-1016 — Componentize dashboard KPI widgets**
  - Split KPIs into independent widget components with shared styling.
  - Add enable/disable controls per widget.
  - Ensure widgets support empty/loading states.
- **WPB-1017 — Add role-based dashboard presets**
  - Define default widget layouts for Technician vs Manager.
  - Provide a reset-to-default option per role.
  - Document the preset mapping in product docs.
- **WPB-1018 — Persist dashboard layout preferences**
  - Store widget order and visibility per user.
  - Apply preferences on login and across devices.
  - Add fallback for users without stored preferences.
