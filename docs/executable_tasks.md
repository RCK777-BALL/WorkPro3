# Executable Task Backlog

The following tickets refine the roadmap epics into implementation-ready tasks. They are formatted for direct import into issue trackers.

## Epic: Offline/Mobile Technician Execution
### Build Offline-First Mobile WO Execution with Pending-Sync Queue
- Description: Deliver a mobile WO execution experience that fully functions offline. Cache WO steps, asset metadata, parts, and technician assignments locally; enqueue mutations (start, step updates, complete, labor logs) in a pending-sync queue that retries with backoff and exposes item states in UI.
- Acceptance Criteria: Mobile client functions without network; offline actions are persisted locally; sync queue retries with exponential backoff; per-operation status (queued/in-flight/failed) visible; sync errors surfaced with actionable retry; telemetry emitted for queue state.
- Affected Components: mobile, backend, API
- Dependencies: Local storage layer, auth/session handling, sync transport.
- Complexity: L

### Add Asset/Part Barcode Scanning to Mobile WO Flow
- Description: Integrate camera-based barcode/QR scanning within WO asset selection and part issuance screens; map scan payload to cached assets/parts and fall back to manual search when ambiguous.
- Acceptance Criteria: Supports Code128/QR/UPC; successful scan populates asset/part fields; ambiguous scans prompt disambiguation; scan failures handled gracefully; respects camera permission prompts.
- Affected Components: mobile, API
- Dependencies: Offline data cache, camera permission handling, barcode library selection.
- Complexity: M

### Conflict Resolution & Audit Trail for Offline Sync
- Description: Add optimistic concurrency (ETag/version) for WO resources; detect conflicts on sync; prompt user with resolution options (mine/theirs/merge where safe); persist audit entries capturing prior values, actor, timestamp, and resolution choice.
- Acceptance Criteria: Conflicts consistently detected; resolution choice updates server state; audit records persisted and retrievable; automated tests cover conflict scenarios.
- Affected Components: backend, API, mobile, DB
- Dependencies: Versioning on WO/steps, audit log schema, sync queue.
- Complexity: L

### Offline Attachments & Staged Upload Queue
- Description: Allow offline capture of photos/notes; store blobs locally; enqueue uploads when online using signed URLs; retries with exponential backoff and corruption detection; show per-attachment status.
- Acceptance Criteria: Attachments accessible while offline; upload queue resumes on connectivity; failed/corrupted uploads flagged; successful uploads link to WO records; telemetry for upload success/failure.
- Affected Components: mobile, backend, API, storage/infra
- Dependencies: Attachment service, storage bucket, auth for signed URLs.
- Complexity: M

## Epic: Inventory → Purchasing Integration
### Reorder Triggers & Vendor Association for Parts
- Description: Extend part schema with min/max thresholds and preferred vendor references; implement nightly and on-demand jobs that generate reorder suggestions when on-hand < min, including vendor recommendation and change audit trail.
- Acceptance Criteria: Thresholds configurable per site; suggestions generated and persisted; preferred vendor surfaced; audit captured for threshold updates; API/UI exposes suggestions list.
- Affected Components: backend, DB, API, frontend
- Dependencies: Inventory counts, vendor master data, scheduler.
- Complexity: M

### Purchase Order Model & Approval States
- Description: Create PO entity with line items, vendor linkage, currency, and status machine (Draft → Submitted → Approved → Ordered → Received → Closed); enforce role-based approvals and persist approver/timestamps.
- Acceptance Criteria: PO CRUD via API/UI; transitions blocked without required approvals; receiving updates inventory; audit of approvals; unit/integration tests for state machine.
- Affected Components: backend, DB, API, frontend
- Dependencies: Vendor records, part catalog, auth/roles, inventory service.
- Complexity: L

### Part Availability in WO Planning UI
- Description: Embed availability/reservation widget in WO planning UI showing on-hand, allocated, and incoming PO quantities; allow planners to reserve parts against WOs and release reservations.
- Acceptance Criteria: Availability reflects real-time counts; reservations decrement available; conflicts flagged; incoming POs linked; UI updates without refresh.
- Affected Components: frontend, backend, API
- Dependencies: Inventory service, PO data, WO planning UI.
- Complexity: M

### Vendor Catalogs / Pricing / Currency Management
- Description: Add vendor catalog ingestion and storage with price breaks, lead times, and currency; apply FX conversion to display standardized costs; allow selecting vendor pricing per PO line.
- Acceptance Criteria: Catalog import/API available; per-vendor pricing persisted; currency conversion applied to totals; lead times shown; PO totals accurate in ledger currency.
- Affected Components: backend, DB, API, frontend
- Dependencies: FX rates source, vendor master, catalog ingest pipeline.
- Complexity: M

## Epic: Reliability & SLA Analytics
### MTBF/MTTR Calculations & APIs
- Description: Implement analytics jobs/endpoints to compute MTBF/MTTR per asset/class/site using failure and repair history; include caching and filters.
- Acceptance Criteria: Metrics follow defined formulas; filters by date range, asset hierarchy, and site; handles no-failure/ongoing repair cases; unit tests for edge cases; API returns paginated results.
- Affected Components: backend, DB, API, frontend
- Dependencies: Failure event model, WO closure data, analytics cache.
- Complexity: M

### SLA Tracking for Response/Resolution
- Description: Configure SLA policies per site/priority; track response/resolution timers on WOs; surface countdowns and breach states; emit notifications on breach.
- Acceptance Criteria: Policies CRUD; timers visible on WO; breaches logged and notified; reports exportable; scheduler monitors timers.
- Affected Components: backend, API, frontend
- Dependencies: Notification service, policy store, scheduler.
- Complexity: M

### Technician Utilization Metrics
- Description: Calculate technician utilization (labor hours vs available capacity) using calendars/PTO; expose API and dashboard views with day/week/month granularity.
- Acceptance Criteria: Availability calendars configurable; utilization excludes travel/idle when configured; trends and comparisons visible; unit tests cover PTO handling.
- Affected Components: backend, API, frontend
- Dependencies: Time tracking, scheduling, calendar data.
- Complexity: M

### Cross-Site / Multi-Period Comparison Layer
- Description: Build comparison APIs/UI components enabling multi-site and multi-period metric comparisons with normalization (per asset/tech) and CSV export.
- Acceptance Criteria: Supports multi-site filters and time slicing; charts show period-over-period comparisons; missing data handled gracefully; CSV export available.
- Affected Components: backend, API, frontend
- Dependencies: Analytics metrics pipeline, auth for site scoping.
- Complexity: M

## Epic: Centralized Multi-Tenant Guardrails
### Tenant-Scoped Middleware for HTTP/WebSocket
- Description: Implement middleware that extracts tenant/site context from auth tokens for REST/WebSocket; reject requests without valid context; propagate to services/DB queries.
- Acceptance Criteria: All requests resolve tenant/site or are rejected; WS upgrade validates context; context available in service layer; integration tests cover REST and WS.
- Affected Components: backend, API, infra
- Dependencies: Auth service, token format, connection handling.
- Complexity: M

### Policy Checks in Service Layer
- Description: Add centralized policy module enforcing tenant/site isolation and role-based access for WO, inventory, purchasing, and analytics services; return standardized errors.
- Acceptance Criteria: Policies invoked on all service entry points; violations consistently blocked with logged events; unit tests per domain; shared error schema.
- Affected Components: backend, API
- Dependencies: Middleware context, auth roles.
- Complexity: M

### Security Logging & Audit Reporting
- Description: Capture security events (denied access, cross-tenant attempts, policy overrides) in structured logs; provide audit API/UI with filtering; add alerts for repeated violations.
- Acceptance Criteria: Logs contain actor/tenant/site and reason; retention per policy; audit endpoints queryable; UI filters work; alerts fire on thresholds.
- Affected Components: backend, DB, API, frontend, infra
- Dependencies: Logging pipeline, SIEM integration, policy layer.
- Complexity: M

### Integration Tests for Tenant Boundary Protection
- Description: Add automated tests validating tenant isolation for CRUD, streaming, and batch endpoints; include malicious cross-tenant attempts.
- Acceptance Criteria: Tests fail when isolation breached; covers REST and WebSocket paths; CI gate enforced; fixtures provide multi-tenant data.
- Affected Components: backend, API, infra
- Dependencies: Test tenants/fixtures, middleware/policy layers.
- Complexity: S

## Epic: PM Engine Enhancements (Compliance / EHS)
### WO Auto-Generation Engine (Time + Usage Based)
- Description: Extend PM engine to generate WOs based on calendar schedules and meter/usage thresholds; include backfill logic to avoid missed cycles and de-duplication safeguards.
- Acceptance Criteria: Supports fixed/variable intervals; usage triggers from meter readings; prevents duplicate WOs; generated WOs audited; configuration UI/API available.
- Affected Components: backend, DB, API
- Dependencies: Meter data ingestion, scheduling service.
- Complexity: L

### Overdue Escalation Rules & SLA Monitoring
- Description: Add escalation rules for overdue PMs/WOs with SLA monitoring; escalate to supervisors and adjust priorities; notifications sent via existing channels.
- Acceptance Criteria: Escalation policies configurable; notifications dispatched; SLA status visible on WO; repeated breaches tracked and reportable.
- Affected Components: backend, API, frontend
- Dependencies: Notification service, SLA engine, scheduler.
- Complexity: M

### LOTO Checklist & Permit Workflows
- Description: Introduce permit-to-work and LOTO checklists linked to WOs; enforce completion before work start/close; capture signatures and timestamps for compliance.
- Acceptance Criteria: Templates definable; start/close blocked until completion; signatures stored; audit trail persisted; mobile-friendly forms.
- Affected Components: backend, DB, API, frontend, mobile
- Dependencies: Forms engine, signature capture, auth for approvals.
- Complexity: M

### Technician Certification & Assignment Validator
- Description: Persist technician certifications with expiry; validate against WO requirements before assignment; surface warnings and reporting for expiring/invalid certifications.
- Acceptance Criteria: Assignments blocked when requirements unmet; UI warnings shown; reports for expiring certs; unit tests cover expiry and gap scenarios.
- Affected Components: backend, DB, API, frontend
- Dependencies: HR/identity data, WO assignment flow, notification service.
- Complexity: M

## Execution Tasks to Complete the Backlog

### Offline/Mobile Technician Execution
- Define the mobile offline data model (work orders, steps, parts, assets) with versioning fields to support conflict detection.
- Implement the pending-sync queue with exponential backoff and per-operation status tracking; emit telemetry for queue lifecycle events.
- Add conflict detection/resolution flow on sync using ETag/version headers and persistence of audit entries.
- Integrate barcode/QR scanning into mobile asset/part selection with graceful permission handling and ambiguity prompts.
- Build offline attachment capture that stores blobs locally and stages uploads through signed URLs when connectivity resumes.

### Inventory → Purchasing Integration
- Extend part schema with min/max thresholds, preferred vendor linkage, and change audit logging; schedule nightly/on-demand reorder suggestion jobs.
- Introduce Purchase Order entity with approval workflow, vendor linkage, and inventory updates on receiving; expose CRUD APIs/UI.
- Embed availability/reservation widget in WO planning UI, including live counts, reservation management, and PO linkage.
- Ingest vendor catalogs with pricing, lead times, and currency support; apply FX conversion when displaying PO totals.

### Reliability & SLA Analytics
- Build analytics pipeline/jobs for MTBF/MTTR with caching and filters (date range, asset hierarchy, site) plus unit tests for edge cases.
- Implement SLA policy CRUD and timer tracking on work orders with breach notifications and report exports.
- Calculate technician utilization using calendars/PTO; surface day/week/month dashboards and ensure exclusions for travel/idle when configured.
- Add multi-site and multi-period comparison APIs/UI with normalization and CSV export handling missing data gracefully.

### Centralized Multi-Tenant Guardrails
- Add tenant/site extraction middleware for REST and WebSocket paths with rejection of unauthenticated context.
- Build centralized policy module invoked across services for tenant isolation and role-based access with standardized errors and tests.
- Implement structured security logging and audit API/UI for denied access attempts with alerting on repeated violations.
- Expand integration test suite covering tenant boundary protection across CRUD, streaming, and batch endpoints.

### PM Engine Enhancements (Compliance / EHS)
- Extend PM engine for time/usage-based WO generation with backfill and de-duplication; expose configuration UI/API.
- Add overdue escalation rules and SLA monitoring for PM/WOs with notifications and breach tracking.
- Create permit-to-work/LOTO checklists with signature capture and gating of WO start/close until completion.
- Persist technician certifications with expiry, enforce against WO requirements during assignment, and surface warnings/reports for expiring certs.

## Tracker-specific task breakdown (BGT-021 → BGT-040)
Use the following slices to open tracker tickets. Each item is grouped by API, Validation, Data Access, UI, and Tests to align contributors across stacks.

### BGT-021: Offline manifest and versioned models
- **API**: Offline manifest endpoint exposing versioned entities (`backend/mobile-sync/routes/manifest.ts`).
- **Validation**: Enforce version fields and optimistic concurrency on write models.
- **Data Access**: Add version columns and seed fixtures for work orders, steps, parts, and assets.
- **UI**: Mobile cache schema and hydration in `frontend/mobile/cache` with background refresh.
- **Tests**: Unit tests for model versioning; integration tests for manifest diffing.

### BGT-022: Pending-sync queue with backoff and telemetry
- **API**: Queue submission/status endpoints in `backend/mobile-sync/routes/queue.ts` including backoff metadata.
- **Validation**: Per-operation schema validation and status enum checks.
- **Data Access**: Persistent queue table with retry/backoff fields and telemetry hooks.
- **UI**: Mobile sync orchestrator with per-operation status and backoff display in `frontend/mobile/sync`.
- **Tests**: Integration tests simulating transient failures and telemetry emission.

### BGT-023: Conflict detection with audit trail
- **API**: Conflict handling using ETag/version headers plus audit exposure in `backend/mobile-sync/conflicts.ts` and `backend/api/middleware/versioning.ts`.
- **Validation**: Reject stale versions and require merge decisions on conflicts.
- **Data Access**: Audit table for conflicts with before/after snapshots and version increment triggers.
- **UI**: Conflict resolution flow with merge previews and audit surfacing.
- **Tests**: Integration tests for concurrent updates and unit tests for audit persistence.

### BGT-024: Barcode/QR scanning in mobile selection
- **API**: Ensure barcode lookup endpoint supports offline cache usage.
- **Validation**: Client-side permission checks and ambiguity handling.
- **Data Access**: Indexes on barcode/QR fields for fast lookup.
- **UI**: Scanner component with permission prompts and ambiguity chooser under `frontend/mobile/components/scanner/` plus `frontend/mobile/hooks/useScannerPermissions.ts`; ensure accessibility copy.
- **Tests**: Device permission mocks and UX tests for ambiguous scans.

### BGT-025: Offline attachment capture with staged upload
- **API**: Signed URL issuance and attachment metadata endpoints (`shared/api/signed-urls.ts`, `backend/mobile-sync/uploads.ts`).
- **Validation**: Enforce size/type limits and verify signatures.
- **Data Access**: Local blob store schema and staged upload tracking table.
- **UI**: Offline attachment capture UI with retry queue integration in `frontend/mobile/storage/blobs.ts`.
- **Tests**: Upload resume scenarios and blob encryption at rest.

### BGT-026: Part schema thresholds and reorder jobs
- **API**: Extend part endpoints with min/max thresholds, preferred vendors, and audit logging.
- **Validation**: Threshold bounds and vendor existence checks.
- **Data Access**: Migrations for thresholds, preferred vendor FK, audit tables, and reorder job state tables.
- **UI**: Part detail/edit forms with threshold fields and vendor picker (`frontend/inventory/parts`).
- **Tests**: Unit tests for reorder calculation and integration tests for audit trails.

### BGT-027: Purchase Order entity and approvals
- **API**: PO CRUD plus approval workflow and receive endpoints updating inventory (`backend/purchasing/po.ts`, `backend/purchasing/routes/`).
- **Validation**: Workflow state machine validation and vendor currency checks.
- **Data Access**: PO tables, approval history, and inventory adjustment hooks.
- **UI**: PO list/detail/approval UI in `frontend/purchasing/po-ui`.
- **Tests**: Approval path coverage, receiving adjustments, and RBAC coverage.

### BGT-028: Availability/reservation widget
- **API**: Availability/reservation endpoints with PO linkage (`backend/inventory/reservations.ts`).
- **Validation**: Prevent over-reservation and enforce reservation expiration rules.
- **Data Access**: Reservation tables and live count materialized view/cache.
- **UI**: Planning widget with live counts, reservation actions, and PO linkage (`frontend/workorders/planning/availability-widget`).
- **Tests**: UI e2e for reservation flows and backend consistency under concurrent holds.

### BGT-029: Vendor catalog ingestion with FX
- **API**: Catalog ingestion endpoints and FX conversion service (`backend/ingestion/vendor-catalog/`, `backend/purchasing/fx.ts`).
- **Validation**: Currency/lead time validation and duplicate catalog detection.
- **Data Access**: Catalog tables with versioning and FX rate cache (`shared/currency/`).
- **UI**: Catalog admin pages and pricing display with converted totals.
- **Tests**: Ingestion parser coverage, FX rounding edge cases, and contract tests for PO consumer.

### BGT-030: MTBF/MTTR analytics pipeline
- **API**: Analytics fetch endpoints with filters (asset/site/date) in `backend/analytics/reliability/mtbf_mttr_job.ts` and related controllers.
- **Validation**: Filter bounds plus null/edge-case handling.
- **Data Access**: ETL jobs populating MTBF/MTTR tables and caching layer.
- **UI**: Reliability dashboards with filters and cached state indicators (`frontend/analytics/reliability`).
- **Tests**: Job edge-case unit tests and API contract tests with fixture data.

### BGT-031: SLA policy CRUD and breach notifications
- **API**: SLA policy CRUD and timer lifecycle endpoints (`backend/sla/policies.ts`, `backend/sla/timers.ts`).
- **Validation**: Policy invariants (targets, grace periods) and timer transitions.
- **Data Access**: Policy tables, timer/event stream, and export artifacts.
- **UI**: SLA policy editor and breach export screens (`frontend/sla/`).
- **Tests**: Timer lifecycle integration tests and notification dispatch verification.

### BGT-032: Technician utilization analytics
- **API**: Utilization query endpoints with calendar/PTO inputs (`backend/analytics/utilization.ts`).
- **Validation**: Calendar overlap rules and exclusion windows.
- **Data Access**: Utilization calculation jobs and caching per window (day/week/month).
- **UI**: Utilization dashboards with filters and calendar overlays (`frontend/analytics/utilization`).
- **Tests**: Calculation unit tests and dashboard snapshot tests.

### BGT-033: Multi-site/multi-period comparisons
- **API**: Comparison endpoints supporting normalization and CSV export (`backend/analytics/comparison.ts`).
- **Validation**: Missing data handling rules and normalization bounds.
- **Data Access**: Aggregation tables and export queues; ensure tenant isolation guardrails.
- **UI**: Comparison dashboards and CSV export flow with progress indicators (`frontend/analytics/comparison`).
- **Tests**: Normalization unit tests and CSV export integration tests.

### BGT-034: Tenant/site extraction middleware
- **API**: REST/WebSocket middleware enforcing tenant/site context (`backend/middleware/tenant_extractor.ts`, `backend/websocket/tenant_guard.ts`).
- **Validation**: Reject unauthenticated or missing tenant/site context.
- **Data Access**: Tenant registry/cache configuration.
- **UI**: Ensure error messaging strings for client consumption.
- **Tests**: Middleware unit tests and WebSocket handshake contract tests.

### BGT-035: Centralized tenant isolation and RBAC
- **API**: Policy module invoked across services with standardized errors (`backend/security/policy.ts`, `shared/auth/roles.ts`).
- **Validation**: Role-based access enforcement and tenant isolation checks.
- **Data Access**: Policy cache/config store and audit hook registration.
- **UI**: Leverage shared error presentation.
- **Tests**: Policy unit tests and integration coverage across key routes.

### BGT-036: Structured security logging and audit UI/API
- **API**: Security audit log endpoints and alert triggers (`backend/security/audit.ts`).
- **Validation**: Alert threshold configuration and PII scrubbing checks.
- **Data Access**: Structured audit tables, alert counters, and retention jobs; shared with conflict audit streams.
- **UI**: Audit dashboards and alert configuration UI (`frontend/security/audit-ui`).
- **Tests**: Alerting integration tests, log schema validation, and UI regression tests.

### BGT-037: Tenant boundary integration tests
- **API**: Test harness covering CRUD/streaming/batch paths under tenant isolation (`backend/tests/tenant_boundary/`).
- **Validation**: Fixtures cover boundary scenarios and rejection cases.
- **Data Access**: Seed multi-tenant fixtures and batch job test data (`dev-server/fixtures/tenants`).
- **UI**: N/A.
- **Tests**: Integration suite spanning REST/WebSocket/batch with guardrail assertions.

### BGT-038: PM engine time/usage WO generation
- **API**: PM configuration endpoints and WO generation controls (backfill/dedup flags) (`backend/pm/routes.ts`).
- **Validation**: Interval bounds and meter trigger validations.
- **Data Access**: PM schedule tables, generation audit logs, and dedup safeguards (`backend/pm/engine.ts`).
- **UI**: PM configuration UI with backfill options and preview (`frontend/pm/config-ui`).
- **Tests**: Generation job unit tests and e2e for schedule-to-WO flow.

### BGT-039: PM overdue escalation and SLA monitoring
- **API**: Escalation policy endpoints and SLA monitoring hooks on PM/WOs (`backend/pm/escalations.ts`).
- **Validation**: Escalation sequence ordering and notification channel validation.
- **Data Access**: Escalation run history and SLA breach tracking.
- **UI**: Escalation configuration and breach views (`frontend/pm/escalation-ui`).
- **Tests**: Escalation workflow tests, notification contract tests, and SLA breach scenarios.

### BGT-040: Permit-to-work/LOTO checklists
- **API**: Checklist endpoints with signature capture and gating checks (`backend/pm/permit.ts`).
- **Validation**: Required checklist completion before start/close and signature validity.
- **Data Access**: Checklist templates, instance tables, and signature blobs; align with storage encryption policies.
- **UI**: Checklist UI with signature capture and gating dialogs in WO flows (`frontend/pm/permit-ui`).
- **Tests**: Gating logic integration tests and signature capture edge cases.

## Execution Checklists by Tracker (BGT-021 → BGT-040)
Use this block to track implementation status. Each checklist mirrors the API/Validation/Data Access/UI/Tests slices already spec
ified above and can be copied into sprint boards.

### BGT-021
- [ ] API: Manifest endpoint (`backend/mobile-sync/routes/manifest.ts`) with pagination/diff support.
- [ ] Validation: Optimistic concurrency guards on writes.
- [ ] Data Access: Version columns added to WOs/steps/parts/assets with seeded fixtures.
- [ ] UI: Mobile cache schema + background refresh in `frontend/mobile/cache`.
- [ ] Tests: Versioning units and manifest diff integration coverage.

### BGT-022
- [ ] API: Queue submission/status with backoff metadata in `backend/mobile-sync/routes/queue.ts`.
- [ ] Validation: Per-operation schema and status enum checks.
- [ ] Data Access: Persistent queue table + telemetry hooks in `shared/telemetry/`.
- [ ] UI: Sync orchestrator UI in `frontend/mobile/sync` showing status/backoff.
- [ ] Tests: Transient failure simulations and telemetry assertions.

### BGT-023
- [ ] API: Conflict endpoints + version middleware (`backend/mobile-sync/conflicts.ts`, `backend/api/middleware/versioning.ts`).
- [ ] Validation: Reject stale versions; enforce merge decision input.
- [ ] Data Access: Conflict audit table with before/after snapshots and version triggers.
- [ ] UI: Merge-preview conflict resolution with audit surfacing.
- [ ] Tests: Concurrent update coverage and audit persistence.

### BGT-024
- [ ] Validation/UI: Permission handling hook + scanner component with ambiguity prompts and accessibility copy.
- [ ] Data Access: Barcode/QR indexes and offline cache lookup paths.
- [ ] Tests: Permission mocks and ambiguous scan UX tests.

### BGT-025
- [ ] API: Signed URL + attachment metadata endpoints (`backend/mobile-sync/uploads.ts`, `shared/api/signed-urls.ts`).
- [ ] Validation: Size/type limits and signature verification.
- [ ] Data Access: Local blob store schema and staged upload tracking.
- [ ] UI: Offline attachment capture with queue integration in `frontend/mobile/storage/blobs.ts`.
- [ ] Tests: Upload resume scenarios and encryption checks.

### BGT-026
- [ ] API: Part endpoint extensions for thresholds/vendor links with audit logging.
- [ ] Validation: Threshold bounds and vendor existence rules.
- [ ] Data Access: Threshold/vender FK migrations, audit tables, reorder job state.
- [ ] UI: Threshold fields + vendor picker in `frontend/inventory/parts`.
- [ ] Tests: Reorder calculation units and audit integrations.

### BGT-027
- [ ] API: PO CRUD + approval/receive endpoints (`backend/purchasing/po.ts`, `backend/purchasing/routes/`).
- [ ] Validation: Workflow state machine and currency/vendor checks.
- [ ] Data Access: PO tables, approval history, inventory adjustment hooks.
- [ ] UI: PO list/detail/approval + receiving UI in `frontend/purchasing/po-ui`.
- [ ] Tests: Approval path, receiving adjustments, RBAC coverage.

### BGT-028
- [ ] API: Availability/reservation endpoints (`backend/inventory/reservations.ts`, `shared/models/reservations.ts`).
- [ ] Validation: Over-reservation prevention and expiration rules.
- [ ] Data Access: Reservation tables and live-count cache/materialized view.
- [ ] UI: Planning widget in `frontend/workorders/planning/availability-widget` with PO linkage.
- [ ] Tests: Reservation flow e2e and concurrent consistency checks.

### BGT-029
- [ ] API: Catalog ingestion + FX conversion endpoints (`backend/ingestion/vendor-catalog/`, `backend/purchasing/fx.ts`).
- [ ] Validation: Currency/lead-time validation and duplicate detection.
- [ ] Data Access: Catalog tables with versioning; FX rate cache.
- [ ] UI: Catalog admin UI and pricing with converted totals.
- [ ] Tests: Ingestion parsers, FX rounding edge cases, PO consumer contracts.

### BGT-030
- [ ] API: MTBF/MTTR endpoints with filters in reliability service + cache layer.
- [ ] Validation: Filter bounds and null/edge-case handling.
- [ ] Data Access: ETL jobs populating analytics tables and caches.
- [ ] UI: Reliability dashboards with filters and cache state indicators.
- [ ] Tests: Job edge-case units and API contract tests.

### BGT-031
- [ ] API: SLA policy CRUD and timer lifecycle endpoints (`backend/sla/policies.ts`, `backend/sla/timers.ts`).
- [ ] Validation: Policy invariants and timer transitions.
- [ ] Data Access: Policy tables, timer/event stream, export artifacts.
- [ ] UI: SLA policy editor and breach export screens in `frontend/sla/`.
- [ ] Tests: Timer lifecycle integrations and notification dispatch.

### BGT-032
- [ ] API: Utilization query endpoints using calendars/PTO (`backend/analytics/utilization.ts`, `backend/calendar/pto.ts`).
- [ ] Validation: Calendar overlap rules and exclusion windows.
- [ ] Data Access: Utilization jobs with windowed caching.
- [ ] UI: Dashboards with filters and calendar overlays in `frontend/analytics/utilization`.
- [ ] Tests: Calculation units and dashboard snapshots.

### BGT-033
- [ ] API: Comparison endpoints with normalization and CSV export (`backend/analytics/comparison.ts`, `shared/csv/`).
- [ ] Validation: Missing data handling and normalization bounds.
- [ ] Data Access: Aggregation tables and export queues.
- [ ] UI: Comparison dashboards and CSV export flow in `frontend/analytics/comparison`.
- [ ] Tests: Normalization unit and export integration tests.

### BGT-034
- [ ] API: Tenant/site extraction middleware (`backend/middleware/tenant_extractor.ts`, `backend/websocket/tenant_guard.ts`).
- [ ] Validation: Reject unauthenticated or missing tenant/site context.
- [ ] Data Access: Tenant registry/cache configuration.
- [ ] Tests: Middleware units and WebSocket contract coverage.

### BGT-035
- [ ] API: Policy module enforcement in `backend/security/policy.ts` with roles in `shared/auth/roles.ts`.
- [ ] Validation: Role-based access and tenant isolation checks.
- [ ] Data Access: Policy cache/config store with audit hooks.
- [ ] Tests: Policy unit tests and route integration coverage.

### BGT-036
- [ ] API: Security audit endpoints and alert triggers (`backend/security/audit.ts`, `shared/telemetry/security.ts`).
- [ ] Validation: Alert threshold configuration and PII scrubbing.
- [ ] Data Access: Structured audit tables, alert counters, retention jobs.
- [ ] UI: Audit dashboards and alert configuration UI.
- [ ] Tests: Alerting integration, schema validation, UI regression tests.

### BGT-037
- [ ] Data Access/Fixtures: Seed multi-tenant fixtures in `dev-server/fixtures/tenants` plus batch job data.
- [ ] Tests: Integration suite across CRUD/streaming/batch in `backend/tests/tenant_boundary/` with guardrail assertions.

### BGT-038
- [ ] API: PM configuration endpoints and engine controls (`backend/pm/routes.ts`, `backend/pm/engine.ts`).
- [ ] Validation: Interval bounds and meter trigger validations.
- [ ] Data Access: PM schedule tables, generation audit logs, dedup safeguards.
- [ ] UI: PM configuration UI with backfill options and preview in `frontend/pm/config-ui`.
- [ ] Tests: Generation job units and e2e schedule-to-WO flow.

### BGT-039
- [ ] API: Escalation policy endpoints and SLA monitoring hooks (`backend/pm/escalations.ts`, `shared/notifications/`).
- [ ] Validation: Escalation sequence ordering and channel validation.
- [ ] Data Access: Escalation run history and SLA breach tracking tables.
- [ ] UI: Escalation configuration and breach views in `frontend/pm/escalation-ui`.
- [ ] Tests: Escalation workflow, notification contracts, SLA breach scenarios.

### BGT-040
- [ ] API: Checklist endpoints with signature capture (`backend/pm/permit.ts`, `shared/signature/`).
- [ ] Validation: Required checklist completion and signature validity before WO start/close.
- [ ] Data Access: Checklist templates, instance tables, signature blobs.
- [ ] UI: Checklist UI with signature capture and gating dialogs in `frontend/pm/permit-ui`.
- [ ] Tests: Gating logic integrations and signature edge cases.
