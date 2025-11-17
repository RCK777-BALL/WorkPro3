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
