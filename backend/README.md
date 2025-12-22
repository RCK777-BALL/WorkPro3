# backend

This folder contains the Express API server. Vite is installed only for
bundling tests with Vitest and is not required to run the server in production.

### UI dependencies

The backend no longer ships React or other client-side component libraries;
those belong in the `frontend` package. The only UI dependency that remains in
this service is `swagger-ui-express`, which serves the API reference under the
server’s `/docs` route for operational visibility.

## Development

Install dependencies and run the server with ts-node:

```bash
npm install
npm run dev
```

### Audit logging

All controllers that modify data must record an entry using `writeAuditLog`.
Provide `tenantId`, `userId`, `action`, `entityType`, and `entityId` along
with optional `before` and `after` snapshots of the entity. These logs are
stored in the `audit_logs` collection and enable traceability for create,
update, and delete operations.

### Type definitions

The project augments Express types to include a `tenantId` field and optional `siteId` on `Request`. The definitions live in `types/express/index.d.ts`. If you modify the TypeScript configuration, ensure
`"**/*.d.ts"` files remain included so these augmentations are recognized. After
editing the type files, restart the TypeScript server (VS Code: Command Palette
→ "TypeScript: Restart TS Server"), rebuild, and run the development server:

```bash
npx tsc -p .
npm run dev
```

Incoming JSON request bodies are limited to **1 MB**. Adjust the limit by editing the `express.json` configuration in `server.ts` if your application requires larger payloads.
Requests to `/api` are protected by a general rate limiter. The department endpoints now fall under this limiter.
The server connects to MongoDB using the `MONGO_URI` environment variable. This variable is used consistently across the codebase and example configuration files. The server also starts a Socket.IO server on the same HTTP port. Clients can listen for real-time updates using the following events:

- `workOrderUpdated`
- `inventoryUpdated`

The backend queues these events using Kafka so that high-volume updates do not overload Socket.IO. The topics used are:

- `workOrderUpdates`
- `inventoryUpdates`

The internal consumer subscribed to these topics broadcasts each message to connected WebSocket clients using the event names listed above.

If Kafka is unavailable or explicitly disabled, messages are retained in an in-memory buffer with backpressure protection. The
producer and consumer expose health data via `/api/status`, and the buffering logic retries sends with exponential backoff to
preserve ordering and at-least-once delivery. When the retry budget is exhausted, the event is logged as a dead-letter for
operational follow-up. Topic names and queue sizing are configurable through environment variables so non-Kafka deployments can
disable the broker and still rely on the in-process buffer.

## Seeding data

Run `npm run seed` to populate the database with sample records. Run `npm run seed:admin` to create a tenant and admin account if the database has no users. Both scripts create the admin user `admin@example.com` with the default password `admin123`. Set the `ADMIN_DEFAULT_PASSWORD` environment variable to override this password when running the scripts.

Ensure the tenant and admin are created before running the main seed script. After users and departments are seeded, the script also adds three notifications (critical, warning, and info) linked to the seeded tenant.

The seed script also plants a few richer demo records:

- Two revisions of the "Line Clearance Checklist" inspection template (v1 and v2).
- A PM schedule linked to the latest template version so planners can see version-aware scheduling.
- A generated work order that already includes a completed checklist so QA can verify closure flows.
- An IoT condition rule configured to auto-create work orders when temperature spikes are ingested.

To seed only departments for a specific tenant, use:

```bash
npx ts-node --files scripts/seedDepartments.ts
```

This script reads `SEED_TENANT_ID` (and optional `SEED_SITE_ID`) from the environment and inserts a few sample department documents.

## Inventory reorder suggestions

A background cron job scans inventory parts with defined `reorderPoint`/`minLevel` thresholds and writes `InventoryReorderSuggestion` records for items that fall below the computed buffer. The scanner skips overlapping runs, records the last run metadata in memory, and prunes stale suggestions so clients always receive the most recent recommendations.

Tunables for the scanner:

- `REORDER_SUGGESTION_CRON` – cron expression for the scan cadence (default `30 * * * *`).
- `REORDER_SUGGESTION_INCLUDE_OPEN_POS` – when set to `false`, open purchase orders are ignored when deciding whether a part is understocked (default `true`).
- `REORDER_SUGGESTION_LEAD_TIME_BUFFER` – quantity buffer added to the reorder threshold when a part has a lead time defined (default `0`).


### Seeded employees

Running the seed script adds a small reporting hierarchy of example users:

| Name | Role | Email | Employee ID | Reports To |
| --- | --- | --- | --- | --- |
| Admin | admin | admin@example.com | ADM001 | – |
| Department Leader | manager | department.leader@example.com | DL001 | Admin |
| Area Leader | manager | area.leader@example.com | AL001 | Department Leader |
| Team Leader | manager | team.leader@example.com | TL001 | Area Leader |
| Team Member One | technician | member.one@example.com | TM001 | Team Leader |
| Team Member Two | technician | member.two@example.com | TM002 | Team Leader |
| Team Member Three | technician | member.three@example.com | TM003 | Team Leader |

 

## Authentication

User sessions rely on a JWT stored in the `token` cookie. Clients must include
this cookie on each request so the `requireAuth` middleware can verify the
session. The cookie is issued with `HttpOnly` and `SameSite=Strict` flags to
mitigate cross-site request forgery, and when `NODE_ENV` is set to `production`
the `Secure` flag is also enabled so it is only sent over HTTPS connections.
Ensure cookies are enabled in your HTTP client or browser.

### Local login

`POST /api/auth/login`

Authenticate with an email and password.

**Payload**

```json
{
  "email": "user@example.com",
  "password": "secret"
}
```

**Response**

Successful login returns a JWT and user object and also sets the `token` cookie:

```json
{
  "token": "<JWT>",
  "user": { "_id": "<userId>", "email": "user@example.com" }
}
```

If multi‑factor authentication is enabled for the account the server instead responds with:

```json
{
  "mfaRequired": true,
  "userId": "<userId>"
}
```

### Registration

`POST /api/auth/register`

Create a new account.

**Payload**

```json
{
  "name": "User Name",
  "email": "user@example.com",
  "password": "secret",
  "tenantId": "<tenantId>",
  "employeeId": "EMP001"
}
```

**Response**

```json
{ "message": "User registered successfully" }
```

### Security policies and MFA

Password strength, MFA posture, audit retention, and session lifetimes are
centrally defined. Override defaults with environment variables when
deploying:

- `PASSWORD_MIN_LENGTH`, `PASSWORD_REQUIRE_UPPERCASE`,
  `PASSWORD_REQUIRE_LOWERCASE`, `PASSWORD_REQUIRE_NUMBER`, and
  `PASSWORD_REQUIRE_SYMBOL` define password complexity requirements.
- `SESSION_SHORT_TTL` and `SESSION_LONG_TTL` set cookie duration for normal and
  "remember me" sessions (values like `8h` or `30d`).
- `MFA_ENFORCED`, `MFA_OPTIONAL_FOR_SSO`, and `MFA_ALLOWED_FACTORS` control MFA
  prompting. When MFA is enforced, login flows return `mfaRequired` until a
  factor is validated.
- `AUDIT_LOG_RETENTION_DAYS` sets a retention window and stamps an `expiresAt`
  value on audit log documents for TTL cleanup.

### OAuth login

`GET /api/auth/oauth/:provider`

Initiate OAuth authentication with a third‑party provider (`google` or `github`).
The user is redirected to the provider’s login page. After approval the provider calls:

`GET /api/auth/oauth/:provider/callback`

The callback issues a JWT and redirects the user back to the frontend with the token and email in the query string:

```
http://localhost:5173/login?token=<JWT>&email=user%40example.com
```

> **Tip:** Azure AD and Google Workspace users can be automatically mapped to
> tenants and sites by configuring `AZURE_AD_TENANT_MAP` and
> `GOOGLE_WORKSPACE_DOMAIN_MAP`. Each entry uses the format
> `<externalId>=<tenantId>[:siteId]` and multiple entries are separated by commas.

### OIDC login

`GET /api/auth/oidc/:provider`

Initiate OpenID Connect authentication (`okta` or `azure`). An optional `tenant` query parameter can be supplied.

`GET /api/auth/oidc/:provider/callback`

The callback behaves like the OAuth flow and redirects back to the frontend with a signed token.

### Single sign-on configuration

Set `ENABLE_OIDC` or `ENABLE_SAML` to `true` to expose SSO endpoints without enabling them globally. Per-tenant settings are
stored in the `identityproviderconfigs` collection with the `IdentityProviderConfig` model, allowing you to persist issuer
identifiers, metadata URLs or XML, ACS/redirect URIs, and PEM-encoded signing certificates.

SAML metadata and placeholders live under `/api/sso/tenants/:tenantId/saml/*`:

- `GET /api/sso/tenants/:tenantId/saml/metadata` returns stored entity IDs, ACS URLs, metadata XML, and certificates.
- `GET /api/sso/tenants/:tenantId/saml/redirect` is a redirect placeholder for IdP-initiated flows.
- `POST /api/sso/tenants/:tenantId/saml/acs` is a stub Assertion Consumer Service endpoint ready for integration.

OIDC tenants can expose discovery-like data via `GET /api/sso/tenants/:tenantId/oidc/metadata`, which returns issuer,
client ID, redirect URI, and metadata URL details.

### SCIM provisioning and JIT onboarding

Set `ENABLE_SCIM=true` and provide a shared secret in `SCIM_BEARER_TOKEN` to
enable `/api/scim/v2` and `/api/scim` routes. Requests must include
`X-Tenant-Id` so the server can scope provisioning to the right tenant. When a
SCIM IdP posts a user payload, the backend will create or update a user record,
mark it for password rotation, respect MFA enforcement rules, and emit an audit
log for export. Group payloads are accepted for compatibility and also recorded
in audit logs.

### Multi‑factor authentication

`POST /api/auth/mfa/setup`

Generate a secret for time‑based one‑time password (TOTP) MFA.

**Payload**

```json
{ "userId": "<userId>" }
```

**Response**

```json
{ "secret": "<base32>", "token": "123456" }
```

### SCIM provisioning and JIT onboarding

Set `ENABLE_SCIM=true` and `SCIM_BEARER_TOKEN=<token>` to expose `/api/scim/v2/Users` and `/api/scim/v2/Groups`. Requests
must include `Authorization: Bearer <token>` and an `X-Tenant-Id` header. SCIM
user payloads now provision or update tenant-scoped users, mark accounts for
password rotation, honor MFA enforcement, and emit audit log entries for
export. Group payloads are accepted for compatibility and recorded in audit
logs.

`POST /api/auth/mfa/verify`

Verify the MFA token and complete authentication.

**Payload**

```json
{ "userId": "<userId>", "token": "123456" }
```

**Response**

```json
{
  "token": "<JWT>",
  "user": { "_id": "<userId>", "email": "user@example.com" }
}
```

## Summary Endpoints

The `/api/summary` routes provide dashboard data:

- `GET /api/summary` – overall counts of assets and work orders.
- `GET /api/summary/assets` – asset count grouped by status.
- `GET /api/summary/workorders` – work order count grouped by status.
- `GET /api/summary/upcoming-maintenance` – PM tasks due in the next 7 days.
- `GET /api/summary/critical-alerts` – open work orders with critical priority.
- `GET /api/summary/low-stock` – inventory items at or below the reorder threshold.

## Inventory Endpoints

The `/api/inventory` routes manage spare parts and supplies:

- `GET /api/inventory` – list all inventory items.
- `GET /api/inventory/low-stock` – items at or below the reorder threshold.
- `GET /api/inventory/:id` – fetch a single item.
- `POST /api/inventory` – create a new item.
- `PUT /api/inventory/:id` – update an item.
- `DELETE /api/inventory/:id` – remove an item.

## Inventory payload

Requests to `POST /api/inventory` accept the following JSON fields. All values
are optional unless otherwise noted:

- `name` (required) – item name
- `description` – details about the part
- `partNumber` – manufacturer or internal SKU
- `quantity` – current stock level
- `unit` – unit of measure
- `location` – where the part is stored
- `minThreshold` – minimum on‑hand quantity
- `reorderThreshold` – reorder point used by the low stock route
- `lastRestockDate` – ISO date string of the last restock
- `vendor` – ID of the vendor supplying the part
- `asset` – ID of the related asset

Example request using a bearer token for authentication:

```bash
curl -X POST "$VITE_API_URL/api/inventory" \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Bearing",
    "description": "Spare bearing for conveyor",
    "partNumber": "BRG-1001",
    "quantity": 50,
    "unit": "pcs",
    "location": "Aisle 2 Bin 5",
    "minThreshold": 10,
    "reorderThreshold": 20,
    "lastRestockDate": "2023-08-31",
    "vendor": "<vendorId>",
    "asset": "<assetId>"
  }'
```

## Department payload

Requests to `/api/departments` expect a nested JSON body containing lines
and stations. Only the following fields are validated:

- `name` for the department itself
- `lines[].name`
- `lines[].stations[].name`

## Environment variables

Configuration is loaded from a `.env` file in this folder. The root
`.env.sample` file shows all available variables. Each option is described
below along with its default value if one exists.

| Variable | Purpose | Default |
| --- | --- | --- |
| `MONGO_URI` | MongoDB connection string. | `mongodb://localhost:27017/workpro` |
| `PORT` | HTTP port the server listens on. | `5010` |
| `NODE_ENV` | Environment name controlling secure cookies when `COOKIE_SECURE` is unset. | `development` |
| `JWT_SECRET` | Secret key used to sign JWT tokens. Required for authentication. | *(none)* |
| `CORS_ORIGIN` | Allowed origins for CORS, comma separated. | `http://localhost:5173` |
| `PM_SCHEDULER_CRON` | Cron expression controlling the PM scheduler. | `*/5 * * * *` |
| `PM_SCHEDULER_TASK` | Path to the task module run on each scheduler tick. | `./tasks/PMSchedulerTask` |
| `LABOR_RATE` | Hourly labor rate used for cost calculations. | `50` |
| `SMTP_HOST` | SMTP server hostname for email notifications. | *(none)* |
| `SMTP_PORT` | SMTP server port. | `587` |
| `SMTP_USER` | Username for SMTP authentication. | *(none)* |
| `SMTP_PASS` | Password for SMTP authentication. | *(none)* |
| `SMTP_FROM` | Default from address for outgoing mail. | value of `SMTP_USER` |
| `COOKIE_SECURE` | Set to `'true'` to always send cookies with the `Secure` flag, or `'false'` to disable it. Defaults to `NODE_ENV === 'production'`. | *(unset)* |
 
| `KAFKA_BROKERS` | Comma-separated Kafka brokers used for the event queue. | *(none)* |
| `KAFKA_CLIENT_ID` | Client id for the Kafka connection. | `cmms-backend` |
| `KAFKA_GROUP_ID` | Consumer group id for the Socket.IO broadcaster. | `cmms-backend-group` |
| `KAFKA_WORK_ORDER_TOPIC` | Topic name used for work order updates. | `workOrderUpdates` |
| `KAFKA_INVENTORY_TOPIC` | Topic name used for inventory updates. | `inventoryUpdates` |
| `MESSAGING_DISABLED` | Set to `true` to bypass Kafka and rely solely on the in-memory buffer. | `false` |
| `MESSAGING_QUEUE_LIMIT` | Maximum buffered events before backpressure drops the oldest payloads to a dead-letter log. | `1000` |
| `MESSAGING_MAX_ATTEMPTS` | Retry attempts before dead-lettering a message. | `5` |
| `MESSAGING_RETRY_BACKOFF_MS` | Base backoff in milliseconds between retry attempts (multiplied by the attempt count). | `500` |
| `MESSAGING_RETRY_MAX_BACKOFF_MS` | Ceiling for exponential retry backoff before giving up on a message. | `15000` |
| `MESSAGING_RETRY_JITTER_RATIO` | Jitter ratio applied to retry backoff to stagger retries. | `0.25` |
| `MESSAGING_RETRY_POLL_INTERVAL_MS` | Interval for the retry worker to scan the queue for ready messages. | `250` |
| `MESSAGING_RETRY_STATE_PATH` | File used to persist in-flight retry state across restarts. | system temp dir |
| `MESSAGING_CHUNK_SIZE` | Maximum payload size in bytes before a message is chunked for transport. | `50000` |
| `MESSAGING_CHUNK_DIR` | Temporary directory for staging chunk files while reassembling large payloads. | system temp dir |
| `MESSAGING_CHUNK_TTL_MS` | Maximum age for incomplete chunk assemblies before they are discarded. | `900000` |
| `SEED_TENANT_ID` | Tenant id used when running the seed scripts. | *(generated)* |
| `DEFAULT_TENANT_ID` | Tenant id assigned to new users and records when none is provided. | *(none)* |
| `ADMIN_DEFAULT_PASSWORD` | Password assigned to the seeded admin user. | `admin123` |

Authentication will fail if `JWT_SECRET` is not defined. Generate a random
value with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
 
