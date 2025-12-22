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

## Metrics formulas
- **MTTR (Mean Time To Repair):** Sum of repair durations (`completedAt - createdAt` or `timeSpentMin`) for completed WOs divided by the number of completed WOs, returned in hours.
- **MTBF (Mean Time Between Failures):** Average time delta in hours between sequential completed failure work orders ordered by `completedAt`.
- **PM Compliance:** `(pmCompleted / pmTotal) * 100`, clamped between 0 and 100; reflects adherence to scheduled PMs.
- **Downtime minutes:** Sum of downtime minutes pulled from completed WOs and logged downtime ranges (Durations derive from explicit minutes on WOs or `end - start` on downtime events).
- **Availability / Performance / Quality / OEE:** Derived from production records per standard formula (`availability = runtime / planned`, `performance = idealTime / runtime`, `quality = good / actual`, `oee = availability * performance * quality`).

## API schema
- **Downtime logs**
  - `POST /api/v1/assets/:assetId/downtime` → `{ start: ISODateString, end?: ISODateString, reason: string }`
  - `GET /api/v1/assets/:assetId/downtime?start=<iso>&end=<iso>` → Paginates downtime rows with `{ _id, start, end, durationMinutes, reason }` and enforces tenant/site filters.
- **Analytics KPIs**
  - `GET /api/v1/analytics/kpis[.{csv|xlsx|pdf}]` → returns `{ mttr, mtbf, backlog, pmCompliance, downtime: { totalMinutes, reasons, trend }, oee, thresholds }` based on filters `{ assetIds?, siteIds?, startDate?, endDate? }`.
  - `GET /api/v1/analytics/trends[.{csv|pdf}]` → `{ availability[], performance[], quality[], energy[], downtime[] }` time-series data built from production + downtime fixtures.
- **Rollups**
  - Metrics rollups stored in `MetricsRollup` documents keyed by `{ tenantId, period, granularity, siteId, assetId }` with fields for MTTR/MTBF, PM compliance, downtime minutes, and WO counts for charts/exports.

## How to test
1. **Seed demo data** — Run `pnpm --filter backend ts-node seed.ts` (or `npm run seed` if scripted) to load two assets, downtime logs with mixed durations, and analytics rollups (MTTR/MTBF/PM compliance/downtime minutes).
2. **API smoke tests**
   - Call `GET /api/v1/analytics/kpis` and confirm downtime totals reflect seeded downtime + WO repair minutes and that MTTR/MTBF values match the rollup fixtures.
   - Call `GET /api/v1/assets/{assetId}/downtime` for both assets to verify varied durations and reasons are returned, plus CSV/PDF exports from analytics endpoints.
3. **E2E verification** — Log a new downtime event, create & complete a linked WO, then re-run `GET /api/v1/analytics/kpis` to ensure MTTR/MTBF and downtime totals update to include the new closure (downtime → WO close → metrics update).

## Non-Goals
- Predictive analytics or anomaly detection (future work).

## Dependencies
- Work Orders and assets for linkage; export utilities if already present.

## Testing/Validation
- Unit tests for MTTR/MTBF and compliance calculations; integration tests ensuring non-overlapping downtime enforcement.
- UI tests for downtime entry and analytics widgets rendering sample data.
- E2E: log downtime → complete linked WO → verify analytics reflects updated MTTR/MTBF.
