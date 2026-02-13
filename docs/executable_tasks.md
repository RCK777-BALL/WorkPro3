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

## Platform Hardening and Parity Gaps (BGT-042 → BGT-047)

### BGT-042: Secure admin provisioning and credential rotation
- **API**: Remove hardcoded default admin seed; require environment-provided bootstrap credentials and first-login rotation (`backend/scripts/seedAdmin.ts`, `backend/auth/passwordPolicy.ts`).
- **Validation**: Enforce strong password policy and lockout/expiry on seeded accounts until rotated.
- **Data Access**: Migration to mark default admin credentials as expired; audit log hooks for bootstrap account changes.
- **UI**: Admin setup flow prompting rotation and MFA enrollment on first login (`frontend/src/modules/admin/setup`).
- **Tests**: Regression tests confirming no default password acceptance and successful rotation path.

### BGT-043: Kafka resilience and graceful fallback
- **API**: Health checks and backpressure handling for Kafka producers/consumers with retry/fallback to in-memory queue (`backend/services/messaging.ts`).
- **Validation**: Event delivery guarantees documented per mode; configurable topic names and disable flag for non-Kafka deployments.
- **Data Access**: Durable buffering with at-least-once semantics and dead-letter logging when Kafka is unavailable.
- **UI**: User-visible freshness indicators and retry banners when realtime streams fall back to polling (`frontend/src/modules/realtime/status`).
- **Tests**: Chaos tests simulating broker outages, ensuring fallback paths preserve event delivery/order.

### BGT-044: Offline sync observability and conflict governance
- **API**: Admin endpoints exposing pending-sync queues, conflict summaries, and device sync telemetry (`backend/routes/mobileSyncAdmin.ts`).
- **Validation**: Configurable conflict policies (prefer server/client/manual) with audit logging of resolutions and overrides.
- **Data Access**: Per-device sync stats, failure reasons, and conflict records persisted for reporting.
- **UI**: Admin dashboards for offline actions, conflicts, and retries with device/user filters (`frontend/src/modules/offline/admin-dashboard`).
- **Tests**: Integration tests covering conflict surfacing, policy application, and audit persistence.

### BGT-045: Safety and compliance module
- **API**: Safety program entities (JSAs, permits, inspections) with scheduling, approvals, and linkage to WOs (`backend/routes/safety.ts`).
- **Validation**: Enforce safety check completion gates on WO start/close; configurable compliance templates per site.
- **Data Access**: Safety checklist templates, completion records, signatures, and document storage with retention rules.
- **UI**: Safety/compliance workspace for authoring templates, tracking inspections, and surfacing compliance status in WO flows (`frontend/src/modules/safety`).
- **Tests**: Workflow tests for WO gating, template versioning, and compliance reporting exports.

### BGT-046: Contractor and vendor workforce management
- **API**: Contractor/vendor profiles with onboarding requirements, insurance/credential tracking, and WO assignment rules (`backend/routes/contractors.ts`).
- **Validation**: Prevent assignments when credentials/insurance are expired; approval flows for new contractors.
- **Data Access**: Credential expiration dates, documents, and assignment history with audit logs.
- **UI**: Contractor roster management with status badges, assignment eligibility warnings, and vendor contacts (`frontend/src/modules/contractors`).
- **Tests**: Eligibility rule tests, onboarding flow tests, and assignment edge cases.

### BGT-047: Calibration and instrumentation management
- **API**: Calibration schedules, certificates, and due/overdue status endpoints tied to assets/instruments (`backend/routes/calibration.ts`).
- **Validation**: Block WO completion when required calibration is expired; alerts for upcoming due dates.
- **Data Access**: Calibration records with certificate storage, tolerances, and linkage to asset hierarchy.
- **UI**: Calibration calendar and certificate repository with export capabilities (`frontend/src/modules/calibration`).
- **Tests**: Calibration schedule calculations, WO gating tests, and export/report validations.

## Integration Delivery (BGT-048 → BGT-050)

### BGT-048: Versioned REST API docs and developer portal samples
- **API**: Publish versioned OpenAPI specs for public and admin APIs with semantic version tags and changelog feeds (`backend/openapi/index.ts`, `docs/api`).
- **Validation**: Contract tests to ensure route handlers remain in sync with generated OpenAPI schemas and deny breaking changes without version bumps.
- **Data Access**: Store generated specs and sample payload fixtures for SDK generation; wire CI artifact publishing to the developer portal static site (`docs/portal`).
- **UI**: Developer portal pages with language-specific starter requests, auth walkthroughs, and environment switcher for sandbox vs. production (`frontend/src/modules/dev-portal`).
- **Tests**: Snapshot tests for generated OpenAPI files and e2e checks that portal samples execute successfully against sandbox mocks.

### BGT-049: Webhook framework for work orders, assets, and inventory events
- **API**: Webhook subscription CRUD with secret rotation, HMAC signing headers, and delivery logs for WO created/updated, asset updates, and inventory adjustments (`backend/routes/webhooks.ts`).
- **Validation**: Enforce per-tenant rate limits, retry policies with exponential backoff, and signature verification helpers for consumers.
- **Data Access**: Delivery attempts persisted with status, latency, and payload digests plus dead-letter queue for failed events; expose replay endpoints.
- **UI**: Tenant admin screens to create endpoints, copy signing secrets, view recent deliveries, and replay failures (`frontend/src/modules/integrations/webhooks`).
- **Tests**: Contract tests for each event payload, retry/resume scenarios, and signature validation including clock-skew handling.

### BGT-050: CSV/SFTP scheduled imports/exports and automation connectors
- **API**: Schedules for CSV import/export jobs with column mappings for assets, WOs, and inventory plus SFTP credential storage and rotation (`backend/routes/data-pipelines.ts`).
- **Validation**: Schema validation for uploads, delimiter/encoding detection, and guardrails to prevent destructive updates without dry-run approvals.
- **Data Access**: Staging tables for inbound files, audit trails for row-level changes, and job history with file references in object storage (`shared/data-pipelines`).
- **UI**: Job wizard to define schedules, mappings, dry-run previews, and delivery channels (email/SFTP/HTTP); include quick-start templates for Zapier and Power Automate (`frontend/src/modules/integrations/data-pipelines`).
- **Tests**: E2E import/export flows with sample files, SFTP connection mocks, and regression coverage for mapping templates.

## Enterprise RBAC and Audit (BGT-051 → BGT-055)

### BGT-051: Role/permission matrix and enforcement middleware
- **API**: Role/permission CRUD endpoints with tenant scoping and module/action granularity (`backend/security/routes/roles.ts`).
- **Validation**: Ensure permissions align to the documented matrix; enforce feature-flagged module disablement per tenant.
- **Data Access**: Permission tables keyed by tenant, role, module, and action; caching layer for middleware reads (`shared/security/permissions`).
- **UI**: None beyond surfaced errors; leverage shared error copy for forbidden responses.
- **Tests**: Middleware integration tests across critical endpoints (create/update/delete/convert/receive/reserve) asserting 403s and allow paths.

### BGT-052: Append-only audit log schema and emission coverage
- **API**: Audit ingest helper callable from controllers/services capturing actor, tenant, action, target type/ID, diffs/snapshots, and request metadata (`backend/security/auditLogger.ts`).
- **Validation**: Prevent mutation of stored audit records; retention configuration and PII scrubbing checks.
- **Data Access**: Dedicated append-only audit collection/table with write-only pathways and retention jobs (`backend/db/audit`).
- **UI**: N/A.
- **Tests**: Serialization/unit tests for audit entries; integration ensuring all critical write endpoints emit audit events and background jobs (e.g., reorder alerts) log meaningful entries.

### BGT-053: RBAC admin UI with effective permission preview
- **API**: Effective-permission resolution endpoint combining role grants and feature flags (`backend/security/routes/effectivePermissions.ts`).
- **Validation**: Input validation for role assignment and per-tenant scope changes.
- **Data Access**: Role assignment mappings per user/tenant with seed defaults (Admin, Dispatcher, Technician, Viewer) plus sample audit entries.
- **UI**: RBAC admin screen to assign roles and preview effective permissions for a user (`frontend/src/modules/security/rbac-admin`).
- **Tests**: UI regression tests for assignment flows and previews; API tests ensuring resolution matches the permission matrix.

### BGT-054: Audit log explorer with filtering and CSV export
- **API**: Audit query endpoints with filters (tenant/user/action/target/date) and CSV export (`backend/security/routes/audit.ts`).
- **Validation**: Pagination bounds, filter sanitization, and export size limits with background job fallback.
- **Data Access**: Indexes on audit collection for common filters; export job artifacts with retention configuration.
- **UI**: Admin page to view/filter audit logs with CSV export controls and request metadata toggle (`frontend/src/modules/security/audit-log`).
- **Tests**: UI filter/export flows, pagination snapshots, and export contract tests.

### BGT-055: Permission matrix documentation and testing guide
- **API**: Expose permission matrix via reference endpoint for API/UI consumers (`backend/security/routes/permissionMatrix.ts`).
- **Validation**: Ensure matrix reflects feature-flagged modules and default roles; doc generation checks in CI.
- **Data Access**: Stored permission matrix definitions synchronized with seed data.
- **UI**: Documentation page/link rendering matrix table (`docs/security/permission-matrix.md`).
- **Tests**: “How to test” coverage ensuring enforcement failures return correct codes and corresponding audit visibility, including forbidden attempt logging where applicable.

## Notifications and SLA Escalations (BGT-056 → BGT-060)

### BGT-056: Notification model and delivery pipelines
- **API**: Notification CRUD/read-state endpoints with tenant scoping and feature flag for email delivery (`backend/notifications/routes.ts`).
- **Validation**: Channel configuration checks, recipient validation, and retry/backoff policies for delivery.
- **Data Access**: Notification tables/queues storing category, message, CTA link, recipients, delivery channels, and read/unread state; dead-letter handling for failures.
- **UI**: None (delivery focused) beyond API docs.
- **Tests**: Unit tests for notification creation, retry logic, and channel selection; integration tests for WebSocket push delivery.

### BGT-057: SLA rule engine and escalation workflows
- **API**: SLA rule CRUD endpoints with thresholds and escalation paths per module (work requests, WOs, POs) (`backend/sla/routes.ts`).
- **Validation**: Rule invariants, escalation ordering, and feature-flag enforcement for modules.
- **Data Access**: Rule storage with escalation targets, timers, and audit of rule changes; background job hooks for overdue detection.
- **UI**: SLA rule management screens with rule builder and escalation preview (`frontend/src/modules/sla/rules`).
- **Tests**: Rule evaluation unit tests; integration tests for breach detection triggering notifications.

### BGT-058: Notifications inbox and UX flows
- **API**: Inbox list/filter endpoints with pagination and bulk mark-as-read operations (`backend/notifications/inbox.ts`).
- **Validation**: Filter bounds (unread/category/SLA) and bulk operation constraints.
- **Data Access**: Query indexes optimized for inbox filters; sample seed notifications including an escalated item.
- **UI**: Notifications dropdown plus dedicated inbox with filters, bulk mark-as-read, and pagination (`frontend/src/modules/notifications`).
- **Tests**: UI tests for inbox interactions and read-state sync; accessibility snapshot tests.

### BGT-059: Notification hooks for workflow events
- **API**: Event emitters for key workflows (new work request, conversion to WO, part reorder alert, PO received, PM generated, downtime logged) wired into notification service (`backend/notifications/hooks.ts`).
- **Validation**: Ensure tenant and recipient scoping with idempotent emission guards.
- **Data Access**: Delivery log entries with topic, status, latency, retries, and dead-letter references.
- **UI**: N/A.
- **Tests**: Integration tests asserting notifications fire for each hook; e2e that unauthorized actions still log attempts when appropriate.

### BGT-060: Seed data and documentation for notifications/SLA
- **API**: Seed loader for sample notifications and SLA rules (`dev-server/fixtures/notifications.ts`).
- **Validation**: Feature flag defaults and retention policies validated during seeding.
- **Data Access**: Seeded inbox entries, SLA rules, and one escalated item for demo tenants.
- **UI**: Documentation updates covering API schema, feature flag behavior, and testing instructions for websocket/email toggle and SLA escalation (`docs/notifications/README.md`).
- **Tests**: Seed verification tests ensuring demo data loads and appears in UI/inbox flows.

## Integrations, Webhooks, and Exports (BGT-061 → BGT-065)

### BGT-061: Scoped API keys with rate limiting and allowlists
- **API**: API key create/rotate/revoke endpoints with scope definitions (read/write per module) and optional IP allowlist (`backend/integrations/api-keys.ts`).
- **Validation**: Scope validation, rotation invariants, and per-key rate limit enforcement with informative errors.
- **Data Access**: API key storage with hashed secrets, scope metadata, rate-limit counters, and audit hooks; sample seeded key for demo tenants.
- **UI**: API key management screens to create, rotate, revoke, and copy keys (`frontend/src/modules/integrations/api-keys`).
- **Tests**: Unit tests for signature/rate-limit helpers; integration tests ensuring scoped access and IP allowlist enforcement.

### BGT-062: Webhook subscription and delivery framework
- **API**: Webhook registration endpoints per tenant with topics (work orders, work requests, parts, POs, downtime, notifications), HMAC signing, and replay support (`backend/integrations/webhooks.ts`).
- **Validation**: Payload signature verification helpers, exponential backoff retry policies, and dead-letter handling on repeated failures.
- **Data Access**: Delivery logs capturing status, latency, retries, and payload digests; DLQ storage and replay audit entries (`backend/integrations/webhook-jobs`).
- **UI**: Admin screens to manage endpoints, view delivery logs, retries, and copy signing secrets (`frontend/src/modules/integrations/webhooks`).
- **Tests**: Integration tests for retry/backoff, signature validation (including clock skew), and replay endpoint behaviors.

### BGT-063: Export job pipeline with CSV/XLSX outputs
- **API**: Export endpoints for WOs/assets/parts with filter parity to list endpoints and long-running job orchestration (`backend/exports/routes.ts`).
- **Validation**: Filter validation, export size limits, and background job fallback; signed URLs or download tokens for completed exports.
- **Data Access**: Export job tables storing status, filters, file references, and audit trail; sample export job records for demo tenants.
- **UI**: Export buttons with progress indicators and download links in relevant list pages (`frontend/src/modules/exports`).
- **Tests**: Integration tests for export filters and job lifecycle; UI tests for download flows.

### BGT-064: Observability and delivery dashboards
- **API**: Delivery log query endpoints for webhooks and export jobs with pagination and filter options (`backend/integrations/observability.ts`).
- **Validation**: Pagination bounds and filter sanitization; ensure sensitive data is redacted in logs.
- **Data Access**: Aggregated metrics (status, latency, retry counts) stored for observability; background jobs for cleanup.
- **UI**: Admin UI to view delivery logs, export job status, and webhook performance with charts (`frontend/src/modules/integrations/observability`).
- **Tests**: UI snapshot tests for dashboard views; contract tests for log query endpoints.

### BGT-065: Security guidance and testing documentation
- **API**: Documentation endpoints or static pages detailing signature verification and rate-limit defaults (`docs/integrations/security.md`).
- **Validation**: CI check to ensure docs stay in sync with scope/rate-limit defaults and webhook signing headers.
- **Data Access**: Sample payload fixtures and verification snippets stored for reference.
- **UI**: Developer documentation linking to API key and webhook screens plus “How to test” covering key creation, webhook verification, and export download.
- **Tests**: Documentation lints and links validation; ensure seed data for API key/webhook/export jobs is referenced in docs.
