# backend

This folder contains the Express API server. Vite is installed only for
bundling tests with Vitest and is not required to run the server in production.

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

## Seeding data

Run `npm run seed` to populate the database with sample records. Run `npm run seed:admin` to create a tenant and admin account if the database has no users. Both scripts create the admin user `admin@example.com` with the default password `admin123`. Set the `ADMIN_DEFAULT_PASSWORD` environment variable to override this password when running the scripts.

Ensure the tenant and admin are created before running the main seed script. After users and departments are seeded, the script also adds three notifications (critical, warning, and info) linked to the seeded tenant.

To seed only departments for a specific tenant, use:

```bash
npx ts-node --files scripts/seedDepartments.ts
```

This script reads `SEED_TENANT_ID` (and optional `SEED_SITE_ID`) from the environment and inserts a few sample department documents.


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

### OAuth login

`GET /api/auth/oauth/:provider`

Initiate OAuth authentication with a third‑party provider (`google` or `github`).
The user is redirected to the provider’s login page. After approval the provider calls:

`GET /api/auth/oauth/:provider/callback`

The callback issues a JWT and redirects the user back to the frontend with the token and email in the query string:

```
http://localhost:5173/login?token=<JWT>&email=user%40example.com
```

### OIDC login

`GET /api/auth/oidc/:provider`

Initiate OpenID Connect authentication (`okta` or `azure`). An optional `tenant` query parameter can be supplied.

`GET /api/auth/oidc/:provider/callback`

The callback behaves like the OAuth flow and redirects back to the frontend with a signed token.

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
| `MONGO_URI` | MongoDB connection string. | `mongodb://localhost:27017/platinum_cmms` |
| `PORT` | HTTP port the server listens on. | `5010` |
| `NODE_ENV` | Environment name controlling secure cookies when `COOKIE_SECURE` is unset. | `development` |
| `JWT_SECRET` | Secret key used to sign JWT tokens. Required for authentication. | *(none)* |
| `CORS_ORIGIN` | Allowed origins for CORS, comma separated. | `http://localhost:5173` |
| `PM_SCHEDULER_CRON` | Cron expression controlling the PM scheduler. | `*/5 * * * *` |
| `PM_SCHEDULER_TASK` | Path to the task module run on each scheduler tick. | `./tasks/PMSchedulerTask` |
| `SMTP_HOST` | SMTP server hostname for email notifications. | *(none)* |
| `SMTP_PORT` | SMTP server port. | `587` |
| `SMTP_USER` | Username for SMTP authentication. | *(none)* |
| `SMTP_PASS` | Password for SMTP authentication. | *(none)* |
| `SMTP_FROM` | Default from address for outgoing mail. | value of `SMTP_USER` |
| `COOKIE_SECURE` | Set to `'true'` to always send cookies with the `Secure` flag, or `'false'` to disable it. Defaults to `NODE_ENV === 'production'`. | *(unset)* |
 
| `KAFKA_BROKERS` | Comma-separated Kafka brokers used for the event queue. | *(none)* |
| `KAFKA_CLIENT_ID` | Client id for the Kafka connection. | `cmms-backend` |
| `KAFKA_GROUP_ID` | Consumer group id for the Socket.IO broadcaster. | `cmms-backend-group` |
| `SEED_TENANT_ID` | Tenant id used when running the seed scripts. | *(generated)* |
| `DEFAULT_TENANT_ID` | Tenant id assigned to new users and records when none is provided. | *(none)* |
| `ADMIN_DEFAULT_PASSWORD` | Password assigned to the seeded admin user. | `admin123` |

Authentication will fail if `JWT_SECRET` is not defined. Generate a random
value with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
 
