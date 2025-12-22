# Template, PM, Work Order Checklist, and IoT API Notes

## Template endpoints
- **Inspection templates** (`/api/inspection/templates`):
  - `GET` lists templates for the tenant (filterable by `siteId`).【F:backend/routes/inspectionRoutes.ts†L24-L55】
  - `POST` accepts `{ name, description?, siteId?, categories?, retentionDays?, sections[] }` and auto-increments `version`; `sections` contains `id`, `title`, and `items` with typed prompts (boolean/text/number/choice).【F:backend/routes/inspectionRoutes.ts†L17-L48】【F:backend/routes/inspectionRoutes.ts†L56-L86】
  - `PUT /templates/:templateId` validates the same schema and bumps `version` while recording audit metadata.【F:backend/routes/inspectionRoutes.ts†L88-L132】

- **Safety templates** (`/api/safety/templates`): in-memory safety catalog supports `GET` with optional `siteId`/`category`, `POST` to create versioned templates (category-driven permit type), and `POST /:templateId/schedule` to enqueue inspections from a template’s sections and site context.【F:backend/routes/safetyRoutes.ts†L114-L234】 Templates can be linked to work orders via `POST /api/safety/work-orders/:workOrderId/link-template` using `{ templateId }`.【F:backend/routes/safetyRoutes.ts†L264-L302】

## PM linkage and work order generation
- **PM tasks** (`/api/pm`): CRUD and generation endpoints are scoped by tenant/site and require PM permissions (`pm.read`/`pm.write`).【F:backend/routes/PMTaskRoutes.ts†L18-L27】 Payloads accept scheduling rules, assets, and departments; generated WOs inherit title/notes and PM linkage (`pmTask`) when cron or meter rules hit.【F:backend/controllers/PMTaskController.ts†L35-L118】【F:backend/controllers/PMTaskController.ts†L180-L218】
- **Meter-triggered PM**: meter rules compare current readings against thresholds and create preventive WOs, updating `lastWOValue` on the meter and `lastGeneratedAt` on the PM task.【F:backend/controllers/PMTaskController.ts†L260-L310】

## Work order checklist execution
- **Checklist updates**: `PUT /api/workorders/:id/checklist` requires tenant+plant context and a `checklist` array payload; returns the updated work order and emits updates to listeners.【F:backend/controllers/WorkOrderController.ts†L955-L1032】 Use to capture execution results for generated WOs.
- **Safety completions**: safety templates linked to a WO can be completed via `POST /api/safety/work-orders/:workOrderId/completions` with `{ templateId, completedBy, signatures?, documents?, status?, lockoutVerified? }`, recording permit type and approvals history.【F:backend/routes/safetyRoutes.ts†L308-L355】 `GET /api/safety/work-orders/:workOrderId/status` reports whether safety prerequisites are met (checklists finished, approvals, LOTO verification, permit coverage).【F:backend/routes/safetyRoutes.ts†L393-L444】

## IoT ingest behavior
- **Telemetry ingestion**: `POST /api/iot/ingest` accepts a reading object, array, or `{ readings: [...] }`; normalizes `assetId/asset/deviceId`, `metric`, `value`, `timestamp`, rejects empty payloads, and stores SensorReadings for the tenant.【F:backend/controllers/IotController.ts†L28-L75】【F:backend/services/iotIngestionService.ts†L99-L171】
- **Rule/alert handling**: ingestion evaluates active `ConditionRule` records per asset/metric, creating corrective WOs when thresholds match and de-duping against active WOs; anomaly detection raises IoT alerts using a rolling z-score window and cooldowns.【F:backend/services/iotIngestionService.ts†L41-L115】【F:backend/services/iotIngestionService.ts†L172-L261】
- **Meter + device updates**: when `triggerMeterPm` is set (via `/api/iot/sensors/ingest`), the service writes `MeterReading` values, triggers meter-based PM WOs, and upserts `SensorDevice` status/last seen details for each device ID seen.【F:backend/controllers/IotController.ts†L77-L116】【F:backend/services/iotIngestionService.ts†L263-L356】【F:backend/services/iotIngestionService.ts†L358-L453】

## Compliance enforcement
- Work orders tied to safety templates cannot start/close until linked templates are completed, approvals are all approved, LOTO templates have `lockoutVerified`, and required permits are satisfied; missing items are returned in the status payload’s `missing` array.【F:backend/routes/safetyRoutes.ts†L393-L444】 Use this endpoint to gate workflow state transitions.

## Sample seed usage
- `backend/seed.ts` seeds a default tenant (“Default Tenant”), a “Main Plant” site, and users (admin/tech/supervisors) with simple credentials (e.g., `admin@example.com` / `admin123`, `tech@example.com` / `tech123`).【F:backend/seed.ts†L58-L135】 PM tasks, assets, and related inventory data are also seeded for local testing when run with `MONGO_URI` and optional `SEED_TENANT_ID`.【F:backend/seed.ts†L20-L57】

## How to test the end-to-end flow
1. **Publish a template**: call `POST /api/inspection/templates` with site-linked sections/items (or use safety template creation). Record the returned `templateId/version`.【F:backend/routes/inspectionRoutes.ts†L56-L86】
2. **Attach template to PM**: create a PM task via `POST /api/pm` including the asset/site and any cron/meter rule. Store the PM task ID, and (for safety workflows) link the template to a WO skeleton using `POST /api/safety/work-orders/{woId}/link-template`.【F:backend/routes/PMTaskRoutes.ts†L18-L27】【F:backend/routes/safetyRoutes.ts†L264-L302】
3. **Generate WO**: trigger `POST /api/pm/generate` to create preventive WOs; confirm the WO references `pmTask`. Meter-driven creation also occurs automatically when readings exceed thresholds.【F:backend/controllers/PMTaskController.ts†L180-L218】【F:backend/controllers/PMTaskController.ts†L260-L310】
4. **Execute checklist**: update the WO checklist via `PUT /api/workorders/{woId}/checklist` with execution results. If using safety templates, post completions and approvals, then poll `GET /api/safety/work-orders/{woId}/status` to verify gating conditions are clear.【F:backend/controllers/WorkOrderController.ts†L955-L1032】【F:backend/routes/safetyRoutes.ts†L308-L444】
5. **IoT-triggered WO**: send telemetry to `POST /api/iot/sensors/ingest` (with `triggerMeterPm`) or `/api/iot/ingest` to test rule-based or meter-based WO creation and device status updates; check the response for `triggeredRules`, `meterPmWorkOrders`, and `deviceUpdates`.【F:backend/controllers/IotController.ts†L77-L116】【F:backend/services/iotIngestionService.ts†L358-L453】
