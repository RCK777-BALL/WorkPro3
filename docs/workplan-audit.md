# Workplan Compliance Audit

## Scope and inputs
- Reviewed current CMMS feature depth from the in-repo competitive audit.【F:docs/cmms-audit.md†L3-L29】
- Cross-checked executable backlog items and sprint statuses against the gap tracker.【F:docs/backlog-gap-tracker.md†L5-L53】【F:docs/executable_tasks.md†L1-L181】
- Sampled implemented services/UI for evidence of delivery (mobile offline queue/admin telemetry, inventory endpoints, and analytics calculations).【F:backend/controllers/MobileController.ts†L217-L472】【F:backend/controllers/MobileSyncAdminController.ts†L18-L197】【F:backend/src/modules/inventory/router.ts†L5-L41】【F:backend/services/analytics.ts†L236-L260】

## Current capability highlights
- Asset intelligence rollups, public request-to-work-order lifecycle, and preventive maintenance templates mirror baseline CMMS parity noted in the prior audit.【F:docs/cmms-audit.md†L6-L15】
- Mobile endpoints support offline action queuing with exponential backoff, telemetry updates, and attachment uploads, plus admin surfaces for pending queues, conflicts, and device metrics.【F:backend/controllers/MobileController.ts†L217-L472】【F:backend/controllers/MobileSyncAdminController.ts†L18-L197】
- Inventory APIs currently cover parts, vendors, alerts, and basic purchase order creation/export guarded by tenant-aware auth middleware.【F:backend/src/modules/inventory/router.ts†L5-L41】
- Reliability metrics such as MTBF/MTTR are already calculated in the analytics service and surfaced in reports/dashboards elsewhere in the codebase.【F:backend/services/analytics.ts†L236-L260】

## Compliance gaps versus workplan
- The backlog tracker shows every executable task from the workplan (BGT-001 through BGT-047) still in a **Scheduled** state, meaning none of the scoped requirements are recorded as completed across offline/mobile execution, inventory→purchasing, analytics, tenant guardrails, or PM/EHS enhancements.【F:docs/backlog-gap-tracker.md†L7-L53】【F:docs/executable_tasks.md†L152-L181】
- Gap-analysis checklists were previously marked complete despite the tracker showing pending work; they have been reset to reflect the outstanding scope for each epic.【F:docs/backlog-gap-analysis.md†L5-L53】
- Several high-priority CMMS parity items called out in the competitive audit (mobile/offline depth, procurement workflows, compliance gating, and multi-tenant hardening) remain open and unverified against production-grade acceptance criteria.【F:docs/cmms-audit.md†L17-L29】【F:docs/backlog-gap-tracker.md†L11-L47】

## Recommended next steps
1. Use the gap tracker as the source of truth for delivery status and avoid marking items complete until merged, tested implementations exist for each BGT slice.
2. Prioritize offline/mobile delivery to close the largest competitive gap, building on the existing queue/telemetry primitives to add manifest diffing, conflict resolution UI, and offline attachment handling.
3. Plan procurement and compliance/EHS stories (PO approvals, reservation widgets, permit-to-work, certifications) to reach parity with the workplan and leading CMMS apps.
4. Strengthen tenant guardrails and analytics breadth (SLA timers, utilization, cross-site comparisons) in line with scheduled backlog items to reduce enterprise risk and parity gaps.

## Tasks to complete the missing executable items
- [ ] **Backlog hygiene**: For each scheduled item in the gap tracker (BGT-001 → BGT-020 and BGT-042 → BGT-047), confirm an open tracker ticket points to the matching executable task specification; add owners and sprint targets where missing.【F:docs/backlog-gap-tracker.md†L7-L53】【F:docs/executable_tasks.md†L1-L181】
- [ ] **Delivery decomposition for offline/mobile**: Break down BGT-021 → BGT-025 into subtasks covering manifest endpoints, sync queue persistence/telemetry, conflict audit tables, scanner permissions, and staged upload queues; attach test plans for manifest diffing, conflict forks, and upload resume paths.【F:docs/executable_tasks.md†L93-L119】【F:docs/executable_tasks.md†L221-L266】
- [ ] **Procurement and inventory workstreams**: Sequence BGT-026 → BGT-029 into API, migration, UI, and test subtasks with dependency ordering (part thresholds → PO approvals → availability widget → catalog/FX ingestion); ensure audit logging hooks are specified for schema updates and approval flows.【F:docs/executable_tasks.md†L268-L314】
- [ ] **Analytics coverage**: Attach data seeding and edge-case test subtasks to BGT-030 → BGT-033 so MTBF/MTTR, SLA timers, utilization, and multi-site comparisons include caching, normalization, and empty-state handling; add CSV/export contract tests where relevant.【F:docs/executable_tasks.md†L316-L356】
- [ ] **Tenant guardrails**: For BGT-034 → BGT-037, add subtasks to wire tenant extraction middleware into WebSocket upgrade paths, centralize policy enforcement, emit structured security logs, and expand multi-tenant fixtures for integration tests; include rejection/violation alert scenarios.【F:docs/executable_tasks.md†L358-L401】
- [ ] **PM/EHS compliance**: Expand BGT-038 → BGT-040 into work items for PM generation jobs, escalation monitors, and permit/LOTO gating UI plus signatures; ensure test plans cover backfill/dedup, notification cadence, and signature validation edge cases.【F:docs/executable_tasks.md†L403-L430】
- [ ] **Platform parity gaps**: For BGT-042 → BGT-047, define subtasks that remove default admin seeds, harden Kafka fallback paths, expose offline sync admin telemetry, and deliver safety/compliance, contractor, and calibration modules; include regression tests for credential rotation, broker outages, conflict policy toggles, and WO gating by credentials/calibration status.【F:docs/executable_tasks.md†L432-L511】
