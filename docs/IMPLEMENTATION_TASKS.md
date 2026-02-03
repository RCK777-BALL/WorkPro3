# WorkPro3 Implementation Board Tasks (EPICs 0–3)

This document focuses on EPICs 0–3 and breaks the board into discrete tasks with clear deliverables. Use it as a checklist for sequencing foundational work from repo standards through core backend domains.

## EPIC 0 — Repo Baseline & Standards
- **WPB-0001 — Lock repo conventions**
  - Add `/docs/ARCHITECTURE.md` with folder structure and system context.
  - Add `/docs/CONTRIBUTING.md` with local dev setup + PR checklist.
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
