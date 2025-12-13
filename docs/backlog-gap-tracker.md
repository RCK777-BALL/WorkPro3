# Backlog Gap Tracker

This tracker captures the executable tasks derived from the CMMS audit gap analysis and schedules them across upcoming sprints. For implementation guidance on each bundle of work, see the [Backlog Gap Tracker implementation guide](./backlog-gap-tracker-guide.md).

| Tracker ID | Area | Task | Target Sprint | Status |
| --- | --- | --- | --- | --- |
| BGT-001 | Offline / Mobile Execution | Build offline-first mobile WO execution with pending-sync queue and telemetry.【F:docs/executable_tasks.md†L5-L32】 | Sprint 24.10 | Done |
| BGT-002 | Offline / Mobile Execution | Add asset/part barcode and QR scanning within mobile WO flows.【F:docs/executable_tasks.md†L13-L18】 | Sprint 24.10 | Done |
| BGT-003 | Offline / Mobile Execution | Implement conflict resolution with audit trail for offline sync collisions.【F:docs/executable_tasks.md†L20-L25】 | Sprint 24.11 | Done |
| BGT-004 | Offline / Mobile Execution | Support offline attachment capture with a staged upload queue.【F:docs/executable_tasks.md†L27-L32】 | Sprint 24.11 | Done |
| BGT-005 | Inventory → Purchasing Integration | Extend part schema with thresholds and preferred vendors plus reorder suggestion jobs.【F:docs/executable_tasks.md†L34-L40】 | Sprint 24.12 | Done |
| BGT-006 | Inventory → Purchasing Integration | Introduce PO approval workflow with role-based states and audit of approvers.【F:docs/executable_tasks.md†L42-L47】 | Sprint 24.12 | Done |
| BGT-007 | Inventory → Purchasing Integration | Embed part availability/reservation widget in WO planning UI tied to live counts and incoming POs.【F:docs/executable_tasks.md†L49-L54】 | Sprint 24.13 | Done |
| BGT-008 | Inventory → Purchasing Integration | Ingest vendor catalogs with pricing/lead times and apply FX conversion to PO totals.【F:docs/executable_tasks.md†L56-L61】 | Sprint 24.13 | Done |
| BGT-009 | Reliability & SLA Analytics | Ship MTBF/MTTR jobs and paginated APIs with caching and filters.【F:docs/executable_tasks.md†L63-L69】 | Sprint 24.14 | Done |
| BGT-010 | Reliability & SLA Analytics | Implement SLA policy CRUD plus response/resolution timers with breach notifications/export.【F:docs/executable_tasks.md†L71-L76】 | Sprint 24.14 | Done |
| BGT-011 | Reliability & SLA Analytics | Calculate technician utilization using calendars/PTO and surface dashboards.【F:docs/executable_tasks.md†L78-L83】 | Sprint 24.15 | Done |
| BGT-012 | Reliability & SLA Analytics | Deliver multi-site and multi-period comparison APIs/UI with CSV export.【F:docs/executable_tasks.md†L85-L90】 | Sprint 24.15 | Done |
| BGT-013 | Centralized Multi-Tenant Guardrails | Add tenant-scoped middleware for HTTP/WebSocket with propagated context to services.【F:docs/executable_tasks.md†L92-L99】 | Sprint 24.16 | Done |
| BGT-014 | Centralized Multi-Tenant Guardrails | Create centralized policy checks for tenant isolation and role-based access with standardized errors/tests.【F:docs/executable_tasks.md†L100-L105】 | Sprint 24.16 | Done |
| BGT-015 | Centralized Multi-Tenant Guardrails | Build security logging + audit reporting with alerts for repeated violations.【F:docs/executable_tasks.md†L107-L112】 | Sprint 24.17 | Done |
| BGT-016 | Centralized Multi-Tenant Guardrails | Expand integration tests that validate tenant boundary protection for CRUD/streaming/batch paths.【F:docs/executable_tasks.md†L114-L119】 | Sprint 24.17 | Done |
| BGT-017 | PM Engine Enhancements | Extend PM engine for time/usage-based WO generation with backfill and deduplication safeguards.【F:docs/executable_tasks.md†L121-L127】【F:docs/executable_tasks.md†L177-L178】 | Sprint 24.18 | Done |
| BGT-018 | PM Engine Enhancements | Add overdue escalation rules with SLA monitoring and notifications for PM/WOs.【F:docs/executable_tasks.md†L129-L134】【F:docs/executable_tasks.md†L178-L179】 | Sprint 24.18 | Done |
| BGT-019 | PM Engine Enhancements | Create permit-to-work/LOTO checklists with signatures and gating of WO start/close.【F:docs/executable_tasks.md†L136-L141】【F:docs/executable_tasks.md†L179-L180】 | Sprint 24.19 | Done |
| BGT-020 | PM Engine Enhancements | Persist technician certifications with expiry and block invalid assignments while surfacing expiring cert reports.【F:docs/executable_tasks.md†L143-L148】【F:docs/executable_tasks.md†L180-L181】 | Sprint 24.19 | Done |
| BGT-021 | Offline / Mobile Execution | Define mobile offline data model with versioning across WOs, steps, parts, and assets.【F:docs/executable_tasks.md†L152-L157】 | Sprint 24.20 | Scheduled |
| BGT-022 | Offline / Mobile Execution | Implement pending-sync queue with exponential backoff, per-operation status, and telemetry.【F:docs/executable_tasks.md†L152-L157】 | Sprint 24.20 | Scheduled |
| BGT-023 | Offline / Mobile Execution | Add conflict detection/resolution on sync using ETag/version headers with audit entries.【F:docs/executable_tasks.md†L152-L157】 | Sprint 24.21 | Scheduled |
| BGT-024 | Offline / Mobile Execution | Integrate barcode/QR scanning into mobile asset/part selection with permission handling and ambiguity prompts.【F:docs/executable_tasks.md†L152-L157】 | Sprint 24.21 | Scheduled |
| BGT-025 | Offline / Mobile Execution | Build offline attachment capture storing blobs locally and staging uploads via signed URLs.【F:docs/executable_tasks.md†L152-L157】 | Sprint 24.21 | Scheduled |
| BGT-026 | Inventory → Purchasing Integration | Extend part schema with thresholds, preferred vendors, audit logging, and reorder suggestion jobs.【F:docs/executable_tasks.md†L159-L163】 | Sprint 24.22 | Scheduled |
| BGT-027 | Inventory → Purchasing Integration | Introduce Purchase Order entity with approval workflow, vendor linkage, inventory updates, and CRUD APIs/UI.【F:docs/executable_tasks.md†L159-L163】 | Sprint 24.22 | Scheduled |
| BGT-028 | Inventory → Purchasing Integration | Embed availability/reservation widget in WO planning UI with live counts, reservations, and PO linkage.【F:docs/executable_tasks.md†L159-L163】 | Sprint 24.23 | Scheduled |
| BGT-029 | Inventory → Purchasing Integration | Ingest vendor catalogs with pricing, lead times, and currency support with FX conversion on PO totals.【F:docs/executable_tasks.md†L159-L163】 | Sprint 24.23 | Scheduled |
| BGT-030 | Reliability & SLA Analytics | Build MTBF/MTTR analytics pipeline/jobs with caching, filters, and edge-case unit tests.【F:docs/executable_tasks.md†L165-L169】 | Sprint 24.24 | Scheduled |
| BGT-031 | Reliability & SLA Analytics | Implement SLA policy CRUD, timer tracking on WOs, and breach notifications/export.【F:docs/executable_tasks.md†L165-L169】 | Sprint 24.24 | Scheduled |
| BGT-032 | Reliability & SLA Analytics | Calculate technician utilization with calendar/PTO inputs and dashboards for day/week/month views.【F:docs/executable_tasks.md†L165-L169】 | Sprint 24.25 | Scheduled |
| BGT-033 | Reliability & SLA Analytics | Add multi-site and multi-period comparison APIs/UI with normalization and CSV export handling missing data.【F:docs/executable_tasks.md†L165-L169】 | Sprint 24.25 | Scheduled |
| BGT-034 | Centralized Multi-Tenant Guardrails | Add tenant/site extraction middleware for REST and WebSocket with rejection of unauthenticated context.【F:docs/executable_tasks.md†L171-L175】 | Sprint 24.26 | Scheduled |
| BGT-035 | Centralized Multi-Tenant Guardrails | Build centralized policy module for tenant isolation and role-based access with standardized errors/tests.【F:docs/executable_tasks.md†L171-L175】 | Sprint 24.26 | Scheduled |
| BGT-036 | Centralized Multi-Tenant Guardrails | Implement structured security logging and audit API/UI with alerting on repeated violations.【F:docs/executable_tasks.md†L171-L175】 | Sprint 24.27 | Scheduled |
| BGT-037 | Centralized Multi-Tenant Guardrails | Expand integration test suite covering tenant boundary protection across CRUD, streaming, and batch endpoints.【F:docs/executable_tasks.md†L171-L175】 | Sprint 24.27 | Scheduled |
| BGT-038 | PM Engine Enhancements | Extend PM engine for time/usage-based WO generation with backfill, deduplication, and configuration UI/API.【F:docs/executable_tasks.md†L177-L181】 | Sprint 24.28 | Scheduled |
| BGT-039 | PM Engine Enhancements | Add overdue escalation rules and SLA monitoring for PM/WOs with notifications and breach tracking.【F:docs/executable_tasks.md†L177-L181】 | Sprint 24.28 | Scheduled |
| BGT-040 | PM Engine Enhancements | Create permit-to-work/LOTO checklists with signature capture and gating of WO start/close until completion.【F:docs/executable_tasks.md†L177-L181】 | Sprint 24.29 | Scheduled |
| BGT-041 | PM Engine Enhancements | Persist technician certifications with expiry, enforce assignment validation, and surface expiry warnings/reports.【F:docs/executable_tasks.md†L177-L181】 | Sprint 24.29 | Scheduled |
| BGT-042 | Platform Hardening | Enforce secure admin provisioning with mandatory credential rotation and MFA enrollment.【F:docs/executable_tasks.md†L328-L334】 | Sprint 24.30 | Scheduled |
| BGT-043 | Platform Hardening | Add Kafka resilience features with documented fallbacks and delivery guarantees for realtime updates.【F:docs/executable_tasks.md†L335-L340】 | Sprint 24.30 | Scheduled |
| BGT-044 | Offline / Mobile Execution | Provide admin visibility into offline sync queues, conflicts, and device telemetry with configurable policies.【F:docs/executable_tasks.md†L342-L347】 | Sprint 24.31 | Scheduled |
| BGT-045 | CMMS Parity | Launch safety/compliance module with WO gating, templates, and reporting coverage.【F:docs/executable_tasks.md†L349-L354】 | Sprint 24.31 | Scheduled |
| BGT-046 | CMMS Parity | Add contractor/vendor workforce management with credential enforcement and assignment rules.【F:docs/executable_tasks.md†L356-L361】 | Sprint 24.32 | Scheduled |
| BGT-047 | CMMS Parity | Implement calibration/instrumentation management with schedules, certificates, and WO gating for expired assets.【F:docs/executable_tasks.md†L363-L367】 | Sprint 24.32 | Scheduled |
| BGT-048 | Integrations | Publish versioned REST API docs with portal samples and enforce contract parity with OpenAPI outputs.【F:docs/executable_tasks.md†L369-L376】 | Sprint 24.33 | Scheduled |
| BGT-049 | Integrations | Ship webhook framework for WO/asset/inventory events with signed deliveries, retries, and replay tools.【F:docs/executable_tasks.md†L378-L384】 | Sprint 24.34 | Scheduled |
| BGT-050 | Integrations | Provide CSV/SFTP import-export schedules plus Zapier/Power Automate starter connectors with safe mappings.【F:docs/executable_tasks.md†L386-L392】 | Sprint 24.35 | Scheduled |
| BGT-051 | Testing | Restore Jest/Vitest tooling so backend/frontend test suites run and fix any surfaced failures.【F:docs/test-suite-remediation-task.md†L1-L19】 | Sprint 24.10 | Proposed |
