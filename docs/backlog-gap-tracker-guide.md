# Backlog Gap Tracker Implementation Guide

Use this guide to move each backlog gap tracker (BGT) entry from "Scheduled" to "In Progress" and "Done" inside this repository. The steps are organized by area so you can work iteratively while keeping code locations and cross-cutting checks in mind.

## Offline / Mobile Execution (BGT-021 → BGT-025)
1. **Model the offline domain**
   - Add versioned schemas in `backend/models/MobileOfflineAction.ts` and `backend/models/WorkOrder.ts` to carry `version`, `etag`, and `lastSyncedAt` fields.
   - Wire serialization helpers in `backend/services` to include version headers on responses and expect `If-Match`/`If-None-Match` on sync routes (see `backend/routes`).
2. **Pending-sync queue + telemetry**
   - Implement a queue worker in `backend/workers` that retries with exponential backoff and per-operation status (pending, succeeded, failed, dead-letter).
   - Emit queue lifecycle metrics via existing logging utilities in `backend/utils` and expose a health/status endpoint in `backend/routes/mobileSync.ts` (create if missing).
3. **Conflict detection and resolution**
   - Enforce ETag/version checks inside sync controllers under `backend/controllers` and persist audit entries with `backend/utils/writeAuditLog` to record resolution choices.
   - Add unit tests under `backend/tests/mobileSync` to cover collision, retry, and happy paths.
4. **Barcode/QR scanning flows**
   - Add camera permission prompts and scanner integration in the mobile client (see `frontend/src/mobile`); map scans to asset/part selectors with ambiguity prompts.
   - Ensure scanned identifiers map back to backend inventory lookups via `backend/routes/inventory.ts` with appropriate auth/tenant guards.
5. **Offline attachments**
   - Store blobs locally in the mobile client (e.g., IndexedDB or filesystem APIs) and stage uploads through signed URL requests to `backend/routes/attachments.ts` when connectivity resumes.
   - Add background upload telemetry and retries to the same queue used for pending sync.

## Inventory → Purchasing Integration (BGT-026 → BGT-029)
1. **Part schema extensions & reorder jobs**
   - Extend `backend/models/InventoryItem.ts` with min/max thresholds, preferred vendor linkage (`Vendor.ts`), and change audit logging.
   - Add reorder suggestion jobs in `backend/tasks` that run nightly/on-demand and surface results via `backend/routes/inventory.ts`.
2. **Purchase Order lifecycle**
   - Complete PO CRUD in `backend/controllers/purchaseOrders` using `backend/models/PurchaseOrder.ts`; enforce approval states and audit logs.
   - Update front-end management UI in `frontend/src/modules/purchasing` to create/update/approve/reject POs and reflect inventory receipts.
3. **Availability/reservation widget**
   - Build a WO planning widget in `frontend/src/modules/work-orders` that consumes live counts/reservations from `backend/routes/workOrders.ts` and links to incoming POs.
   - Add reservation APIs in `backend/services/inventory` that validate stock, tenant, and site constraints.
4. **Vendor catalog ingestion & FX support**
   - Add ingestion scripts under `backend/scripts/vendorCatalogs` to pull pricing/lead times, normalize currencies, and store on `Vendor.ts`.
   - Compute FX-adjusted PO totals in controller responses and surface converted totals in the UI with currency selectors.

## Reliability & SLA Analytics (BGT-030 → BGT-033)
1. **Analytics pipeline for MTBF/MTTR**
   - Build aggregation jobs in `backend/tasks/analytics` pulling from `WorkOrder.ts` and `Asset.ts`; cache results in Redis if available.
   - Expose paginated/filterable APIs in `backend/routes/analytics.ts` with tests in `backend/tests/analytics` for edge cases (null durations, censored data).
2. **SLA policy CRUD & breach tracking**
   - Implement CRUD controllers in `backend/controllers/slaPolicies` persisting to `backend/models/MaintenanceSchedule.ts` or a new SLA model.
   - Track response/resolution timers on work orders; emit breach notifications through existing notifier utilities in `backend/services/notifications`.
3. **Technician utilization dashboards**
   - Compute utilization using calendars/PTO from `backend/models/TimeSheet.ts` and publish dashboards via `frontend/src/modules/analytics/utilization`.
   - Account for travel/idle exclusions with configuration flags stored alongside tenants (`backend/models/Tenant.ts`).
4. **Multi-site/period comparisons**
   - Provide normalized comparison APIs (site, region, time window) in `backend/routes/analytics.ts` with CSV export helpers in `backend/utils/csv`.
   - frontend charts/tables should live in `frontend/src/modules/analytics/comparisons` with empty-state handling for missing data.

## Centralized Multi-Tenant Guardrails (BGT-034 → BGT-037)
1. **Tenant/site extraction middleware**
   - Create middleware in `backend/middleware/tenantContext.ts` that resolves tenant/site from auth tokens and rejects requests lacking context; apply to REST and WebSocket (`backend/socket.ts`).
2. **Policy enforcement module**
   - Centralize role/permission checks in `backend/services/authorization` and reuse across controllers via dependency injection or helpers.
   - Standardize error responses and logging using `backend/utils` utilities.
3. **Security logging & audit surface**
   - Emit structured security logs for denied access to `AuditLog.ts` and expose an audit query endpoint at `backend/routes/audit.ts` with pagination and filters.
   - Add alerting thresholds (e.g., repeated violations) using scheduled checks in `backend/tasks/security`.
4. **Integration tests for tenant boundaries**
   - Expand integration tests in `backend/tests/tenant-boundaries` to cover CRUD, streaming (Socket.IO), and batch endpoints.
   - Include fixtures for multiple tenants and assert cross-tenant data is rejected/filtered.

## PM Engine Enhancements (BGT-038 → BGT-041)
1. **Time/usage-based generation & configuration**
   - Enhance PM scheduling logic in `backend/services/pmEngine` to handle time and meter-based triggers with backfill and de-duplication safeguards.
   - Add configuration UI/API in `frontend/src/modules/pm` and `backend/routes/pm.ts` to manage thresholds and recurrence.
2. **Overdue escalation & SLA monitoring**
   - Track overdue PMs and SLAs via background jobs in `backend/tasks/pm` and notify through the notification service.
   - Persist breach history on `WorkOrder.ts` and present alerts in `frontend/src/modules/pm/escalations`.
3. **Permit-to-work / LOTO checklists**
   - Model permits in `backend/models/Permit.ts`; gate WO start/close in `backend/controllers/workOrders` until checklists are signed.
   - Add signature capture components in `frontend/src/modules/pm/permits` and audit results using `writeAuditLog`.
4. **Technician certifications**
   - Persist certifications and expiry on `backend/models/TeamMember.ts` or a dedicated model; enforce validation in assignment flows within `backend/controllers/workOrders`.
   - Surface expiring certifications in `frontend/src/modules/pm/certifications` with reports and assignment warnings.

## Cross-cutting practices
- **Telemetry & audits**: Use `writeAuditLog` for all mutating actions and emit metrics for queues/tasks to simplify post-release validation.
- **Tenancy**: Ensure every new route enforces tenant/site scoping using shared middleware. Avoid cross-tenant queries in aggregation pipelines.
- **Testing**: Add unit/integration coverage near the touched code paths (e.g., `backend/tests/*`, `frontend/src/**/__tests__`), especially around guardrails and sync logic.
- **Documentation**: Update `docs/backlog-gap-tracker.md` statuses and link any architectural decisions in `docs/` when a BGT item moves forward.
