# Backlog Gap Analysis

This note links the product gaps identified in the CMMS audit to the executable backlog entries that are still missing from the codebase. Each unchecked item should be created in the tracker and scheduled.

## Offline / Mobile Execution
- Gap: No dedicated offline-capable mobile work execution, attachments, or scanning flows exist today.【F:docs/cmms-audit.md†L17-L29】
- Missing executable tasks:
  - [x] Build offline-first mobile WO execution with pending-sync queue and telemetry (BGT-001, Sprint 24.10).【F:docs/executable_tasks.md†L5-L32】
  - [x] Add asset/part barcode and QR scanning within mobile WO flows (BGT-002, Sprint 24.10).【F:docs/executable_tasks.md†L13-L18】
  - [x] Implement conflict resolution with audit trail for offline sync collisions (BGT-003, Sprint 24.11).【F:docs/executable_tasks.md†L20-L25】
  - [x] Support offline attachment capture with a staged upload queue (BGT-004, Sprint 24.11).【F:docs/executable_tasks.md†L27-L32】

## Inventory → Purchasing Integration
- Gap: Inventory currently lacks end-to-end purchasing flows such as vendor catalogs, reservations, and FX-aware pricing.【F:docs/cmms-audit.md†L17-L29】
- Missing executable tasks:
  - [x] Extend part schema with thresholds and preferred vendors plus reorder suggestion jobs (BGT-005, Sprint 24.12).【F:docs/executable_tasks.md†L34-L40】
  - [x] Introduce PO approval workflow with role-based states and audit of approvers (BGT-006, Sprint 24.12).【F:docs/executable_tasks.md†L42-L47】
  - [x] Embed part availability/reservation widget in WO planning UI tied to live counts and incoming POs (BGT-007, Sprint 24.13).【F:docs/executable_tasks.md†L49-L54】
  - [x] Ingest vendor catalogs with pricing/lead times and apply FX conversion to PO totals (BGT-008, Sprint 24.13).【F:docs/executable_tasks.md†L56-L61】

## Reliability & SLA Analytics
- Gap: Reliability/SLA metrics beyond cost rollups (MTBF/MTTR breadth, SLA timers, utilization, cross-site comparisons) are not yet end-to-end in dashboards and APIs.【F:docs/cmms-audit.md†L17-L29】
- Missing executable tasks:
  - [x] Ship MTBF/MTTR jobs and paginated APIs with caching and filters (BGT-009, Sprint 24.14).【F:docs/executable_tasks.md†L63-L69】
  - [x] Implement SLA policy CRUD plus response/resolution timers with breach notifications/export (BGT-010, Sprint 24.14).【F:docs/executable_tasks.md†L71-L76】
  - [x] Calculate technician utilization using calendars/PTO and surface dashboards (BGT-011, Sprint 24.15).【F:docs/executable_tasks.md†L78-L83】
  - [x] Deliver multi-site and multi-period comparison APIs/UI with CSV export (BGT-012, Sprint 24.15).【F:docs/executable_tasks.md†L85-L90】

## Centralized Multi-Tenant Guardrails
- Gap: There is no consolidated tenant/site middleware or unified policy enforcement for REST and WebSocket traffic.【F:docs/cmms-audit.md†L17-L29】
- Missing executable tasks:
  - [x] Add tenant-scoped middleware for HTTP/WebSocket with propagated context to services (BGT-013, Sprint 24.16).【F:docs/executable_tasks.md†L92-L99】
  - [x] Create centralized policy checks for tenant isolation and role-based access with standardized errors/tests (BGT-014, Sprint 24.16).【F:docs/executable_tasks.md†L100-L105】
  - [x] Build security logging + audit reporting with alerts for repeated violations (BGT-015, Sprint 24.17).【F:docs/executable_tasks.md†L107-L112】
  - [x] Expand integration tests that validate tenant boundary protection for CRUD/streaming/batch paths (BGT-016, Sprint 24.17).【F:docs/executable_tasks.md†L114-L119】

## PM Engine Enhancements (Compliance / EHS)
- Gap: PM flows lack automated generation, overdue escalations, LOTO/permit checklists, and certification validation expected for compliance-heavy sites.【F:docs/cmms-audit.md†L17-L29】
- Missing executable tasks:
  - [x] Extend PM engine for time/usage-based WO generation with backfill and deduplication safeguards (BGT-017, Sprint 24.18).【F:docs/executable_tasks.md†L121-L127】【F:docs/executable_tasks.md†L177-L178】
  - [x] Add overdue escalation rules with SLA monitoring and notifications for PM/WOs (BGT-018, Sprint 24.18).【F:docs/executable_tasks.md†L129-L134】【F:docs/executable_tasks.md†L178-L179】
  - [x] Create permit-to-work/LOTO checklists with signatures and gating of WO start/close (BGT-019, Sprint 24.19).【F:docs/executable_tasks.md†L136-L141】【F:docs/executable_tasks.md†L179-L180】
  - [x] Persist technician certifications with expiry and block invalid assignments while surfacing expiring cert reports (BGT-020, Sprint 24.19).【F:docs/executable_tasks.md†L143-L148】【F:docs/executable_tasks.md†L180-L181】
