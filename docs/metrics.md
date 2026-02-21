# Maintenance Metrics Reference

This guide documents the maintenance analytics metrics surfaced by the WorkPro3 analytics endpoints.

## MTTR (Mean Time to Repair)

**Definition:** Average time to complete corrective work, measured in hours.

**backend source:** `backend/services/analytics.ts` calculates MTTR using completed work orders or work history time spent.

**Formula:**

```
MTTR = Sum(duration from createdAt → completedAt) / count(completed work orders)
```

When Work History entries exist, their `timeSpentHours` values are averaged first and used as the MTTR baseline.

## MTBF (Mean Time Between Failures)

**Definition:** Average time between completed failure events, measured in hours.

**backend source:** `backend/services/analytics.ts` computes MTBF by sorting completed work orders by completion timestamp and averaging the deltas.

**Formula:**

```
MTBF = Sum(time between consecutive completed work orders) / (count(completed work orders) - 1)
```

If fewer than two completed events exist, MTBF is reported as `0`.

## Backlog

**Definition:** Count of open work orders that are not in `completed` or `cancelled` status.

**backend source:** `backend/services/analytics.ts` filters work orders by status and returns the count as backlog.

## PM Compliance

**Definition:** Percentage of preventive maintenance work orders completed within the selected window.

**backend source:** `backend/services/analytics.ts` uses dashboard KPI data to compute preventive totals and completions.

**Formula:**

```
PM Compliance % = (completed preventive work orders / total preventive work orders) * 100
```

## Related Endpoints

- `/api/analytics/maintenance` — Maintenance summary metrics (JSON)
- `/api/analytics/maintenance.csv` — Maintenance metrics export (CSV)
- `/api/analytics/maintenance.xlsx` — Maintenance metrics export (XLSX)
- `/api/analytics/v2/metrics/reliability` — Reliability breakdown (MTTR/MTBF)
- `/api/analytics/v2/metrics/backlog` — Backlog size and aging
- `/api/analytics/v2/metrics/pm-compliance` — PM compliance totals
