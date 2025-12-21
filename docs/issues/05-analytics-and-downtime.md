# Analytics and Downtime Tracking

## Summary
Add downtime event capture and analytics endpoints to report MTTR/MTBF, backlog, and PM compliance with supporting UI views.

## User Stories
- As a maintenance analyst, I can enter downtime events and see MTTR/MTBF by asset.
- As a supervisor, I can view backlog burn-down and PM compliance trends.
- As an executive, I can export analytics snapshots for reporting.

## Acceptance Criteria
- **Model:** Add `DowntimeEvent` with asset/work order linkage, start/stop times, cause codes, impact, and tenant scope.
- **APIs:** Endpoints to create/list/update downtime events; analytics endpoints for MTTR/MTBF, backlog size/age, and PM compliance over selectable time windows.
- **UI:** Downtime entry form and table with filters; analytics dashboard tiles and charts for MTTR/MTBF, backlog aging, and PM compliance percentages.
- **Data quality:** Enforce non-overlapping downtime ranges per asset and require reasons; auto-close downtime when linked WO closes if not set.
- **Exports:** CSV/XLSX export endpoints for downtime and analytics summaries with filters.
- **Seed data:** Sample downtime events across two assets with varying durations plus precomputed analytics fixtures for demo dashboards.
- **Docs:** Describe metrics formulas, API schema, and “How to test” for analytics outputs.

## Non-Goals
- Predictive analytics or anomaly detection (future work).

## Dependencies
- Work Orders and assets for linkage; export utilities if already present.

## Testing/Validation
- Unit tests for MTTR/MTBF and compliance calculations; integration tests ensuring non-overlapping downtime enforcement.
- UI tests for downtime entry and analytics widgets rendering sample data.
- E2E: log downtime → complete linked WO → verify analytics reflects updated MTTR/MTBF.
