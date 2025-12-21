# Work Request Portal API

The Work Request Portal exposes a public intake form plus authenticated triage and conversion endpoints. Requests store tenant/site context, requester contact info, optional attachments, and conversion metadata so dispatchers can promote vetted submissions into Work Orders.

## Schema highlights

Work requests persist the following notable fields:

- **Identity and context:** `token` (unique public tracker), `tenantId`, `siteId`, `requestForm`, and optional `requestType`/`category` for routing alignment.
- **Requester details:** `requesterName` (required), optional `requesterEmail`/`requesterPhone`, and `location`/`assetTag` for localizing issues.
- **Workflow state:** `priority` (`low|medium|high|critical`), `status` (`new|reviewing|converted|closed`), approval metadata, and SLA timestamps.
- **Artifacts:** uploaded `photos` and typed `attachments` keyed by the form definition, plus routing decisions (`ruleId`, `destinationType`, `queue`).
- **Conversion linkage:** `workOrder` stores the generated Work Order ID when conversion succeeds; auto-conversion also runs when approval status flips to `approved`.

【F:backend/models/WorkRequest.ts†L7-L118】【F:backend/models/WorkRequest.ts†L120-L174】

## Endpoints

Base path: `/api`

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/public/work-requests` | Public | Submit a request form with optional photos/attachments. Validates required fields per form/type. |
| GET | `/public/work-requests/:token` | Public | Retrieve status and timeline updates for a submitted request via its public token. |
| GET | `/work-requests` | JWT + `workRequests:read` | List requests for the authenticated tenant/site context. |
| GET | `/work-requests/summary` | JWT + `workRequests:read` | Summary counts and recent items for dashboards. |
| GET | `/work-requests/:requestId` | JWT + `workRequests:read` | Fetch a single request by ID. |
| POST | `/work-requests/:requestId/convert` | JWT + `workRequests:convert` | Create a Work Order from a request; guarded against duplicate conversions. |
| GET | `/work-requests/types` | JWT + `workRequests:read` | List configured request types. |
| POST | `/work-requests/types` | JWT + `workRequests:convert` | Create a request type with required fields and attachment rules. |
| PUT | `/work-requests/forms/:formSlug` | JWT + `workRequests:convert` | Upsert a request form schema tied to a slug. |

【F:backend/src/modules/work-requests/router.ts†L31-L68】【F:backend/src/modules/work-requests/router.ts†L70-L85】

### Request/response examples

**Submit public request with photo upload**

```bash
curl -X POST http://localhost:5010/api/public/work-requests \
  -F "formSlug=general" \
  -F "title=Safety alert" \
  -F "description=Chemical smell near the mixing station" \
  -F "requesterName=Jordan" \
  -F "priority=high" \
  -F "assetTag=LINE-7" \
  -F "photos=@/path/to/photo.jpg"
```

**Check public status via token**

```bash
curl http://localhost:5010/api/public/work-requests/<token-from-submission>
```

**List requests (auth required)**

```bash
curl -H "Authorization: Bearer <jwt>" \
  http://localhost:5010/api/work-requests
```

**Convert to Work Order (idempotent)**

```bash
curl -X POST -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{"priority":"high","workOrderType":"corrective"}' \
  http://localhost:5010/api/work-requests/<requestId>/convert
```

## Permissions and visibility

- **Public intake:** `/public/work-requests` endpoints require no authentication; form slugs map to tenant/site context and enforce required fields plus attachment rules.
- **Tenant scoping:** All authenticated routes apply `tenantScope`, using the request’s tenant/site to filter queries and ensure isolation.
- **Role gates:** `workRequests:read` is required for list/detail/summary/type discovery; `workRequests:convert` is required for conversions and authoring types/forms.

【F:backend/src/modules/work-requests/router.ts†L31-L85】

## Testing (API + UI)

1. **API via curl**
   - Submit a public request with form data and verify the response contains a `token`.
   - Retrieve status using the token to confirm timeline entries and any linked Work Order IDs.
   - Authenticate as a dispatcher/admin and call `/work-requests` and `/work-requests/summary` to see tenant-scoped results.
   - Convert a request with `/work-requests/:id/convert` and confirm the response returns `workOrderId`.
2. **UI workflow**
   - Open the **Work Requests** dashboard in the app sidebar; the page lists recent submissions, status badges, and attachments.
   - Use the **Convert** action on an open request; the UI shows a success toast and tags the row with the new Work Order ID.

【F:frontend/src/components/layout/Sidebar.tsx†L102-L109】【F:frontend/src/pages/WorkRequestDashboard.tsx†L10-L122】【F:frontend/src/pages/WorkRequestDashboard.tsx†L140-L215】

## Duplicate conversion and idempotency

- Conversion checks for an existing `workOrder` link and returns `409` if a request was already converted, preventing duplicate Work Orders.
- Public submission tokens are generated uniquely; repeated submissions with the same form data will produce distinct tokens but respect attachment/required-field guards.
- Approval-driven auto-conversion in the model also sets `status` to `converted`, so manual conversions should only be attempted on `new/reviewing` requests.

【F:backend/src/modules/work-requests/service.ts†L370-L416】【F:backend/src/modules/work-requests/service.ts†L182-L216】【F:backend/models/WorkRequest.ts†L122-L154】
