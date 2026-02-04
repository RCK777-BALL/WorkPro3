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

## EPIC 3 — Backend Domain Completion (Top-5 CMMS Core)
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

## EPIC 4 — Frontend Feature Completion (Top-5 UX)
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
