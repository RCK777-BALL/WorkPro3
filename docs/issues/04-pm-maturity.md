# Preventive Maintenance Maturity

## Summary
Deliver procedure templates with versioning and link them to PM schedules and Work Orders, including completion tracking and IoT-triggered auto-WOs.

## User Stories
- As a maintenance planner, I can author reusable PM procedure templates with checklists and attach them to PMs and WOs.
- As a technician, I can execute a PM with clear steps, capture readings, and mark tasks complete.
- As an ops manager, I can generate Work Orders automatically when IoT thresholds are exceeded.

## Acceptance Criteria
- **Templates:** Model for procedure/checklist templates with versioning, categories, required tools/parts, estimated duration, and safety steps; immutable published versions linked to PM schedules and WOs.
- **PM linkage:** UI/API to attach templates to PM schedules and copy the latest published version into generated WOs; show compliance status and completion timestamps.
- **Checklist execution:** WO UI renders checklist with pass/fail/reading fields, required evidence uploads, and technician sign-off; enforce completion before close.
- **IoT auto-WO:** Extend `/iot/ingest` pipeline to evaluate thresholds mapped to assets/PM templates and auto-generate Work Orders with linkage back to the event payload.
- **History:** Store readings and completion logs per checklist item; expose in WO detail and reporting export.
- **Seed data:** Sample PM template with two versions, linked PM schedule, and generated WO demonstrating completion tracking; sample IoT trigger config.
- **Docs:** API schema and “How to test” covering template publish, WO generation, and IoT-triggered auto-WO.

## Non-Goals
- Full CMMS calendar UI (only minimal PM schedule selection needed for demo).

## Dependencies
- Work Order model and IoT ingestion pipeline.

## Testing/Validation
- Unit tests for template versioning rules and IoT threshold evaluation; integration tests for PM schedule → WO generation and checklist completion enforcement.
- UI tests for template builder and checklist execution flow.
- E2E: publish template → attach to PM → generate WO → capture readings → close WO with compliance recorded.
