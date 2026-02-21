# WorkPro

This repository contains a small full‑stack app split into two folders:

- **backend** – Express API server with a MongoDB database and Socket.IO. This is the canonical backend path used by contributors and CI. Any other backend directories in the repo are archived for reference only.
- **frontend** – React client built with Vite.

## Project structure

```
WorkPro/
 backend/      Express API and tests (source of truth)
 frontend/     React client and tests
 dev-server/   Lightweight API for frontend development
 archives/     Historical backends kept for reference only
 playground-1.mongodb.js  Sample MongoDB script
```

## Integration guides

- [AI Copilot API](docs/ai-copilot.md) – request/response schemas, upstream data sources, and security notes for `/ai/copilot`.
- [IoT Gateway Ingestion](docs/iot-gateway.md) – MQTT/HTTP payload formats, storage pipeline, and automated alert/work-order flows for `/iot/ingest`.
- [Work Request Portal](docs/work-requests.md) – public intake, triage, and convert-to-work-order endpoints plus testing guidance.
- [Inventory module](docs/inventory.md) – models, endpoints, permissions, costing, and test walkthrough for stock control and reorder alerts.

Run `npm install` inside each folder before development. Node modules are
not committed to the repository.

## backend setup

1. `cd backend` (the canonical backend directory)
2. Copy `../.env.sample` to `.env`:
   ```bash
   cp ../.env.sample .env
   ```
   Update the required environment variables such as `MONGO_URI`, `JWT_SECRET`,
   and `CORS_ORIGIN`. The example connection string uses
   `mongodb://localhost:27017/workpro`.
 
3. Seed the database with a tenant and admin account:
   ```bash
   npm run seed:admin
   ```
4. Install dependencies with `npm install`.
5. Start the development server:
   ```bash
   npm run dev
   ```
   The server expects a running MongoDB instance. Override `MONGO_URI` if your
   database is not at the default location.

## frontend setup

1. `cd frontend`
2. Copy `../.env.sample` to `.env.local` and update `VITE_API_URL`,
    `VITE_WS_URL`, and `VITE_SOCKET_PATH`.
 
3. Install dependencies with `npm install`.
4. Run the development server:
   ```bash
   npm run dev
   ```
   The app will open at [http://localhost:5173](http://localhost:5173).
   Restart the dev server after modifying environment variables so changes take effect.

### Offline mode

If `VITE_WS_URL` or `VITE_SOCKET_PATH` is empty, or the browser is offline, work order updates are
queued in `localStorage` under `offline-queue`. Once the WebSocket defined by `VITE_WS_URL` and `VITE_SOCKET_PATH` is restored, the queue is flushed and the requests are sent to the API.

## Docker development

The project includes Dockerfiles for the backend and frontend. Before starting
the stack, define `JWT_SECRET` in your environment or in a `.env` file so Docker
Compose can pass it to the backend container:

```bash
echo "JWT_SECRET=change_me" > .env
docker compose up --build
```

The API URL is configured via the `VITE_API_URL` environment variable, and the web client runs at
`http://localhost:5173`.

### Kubernetes manifests

Sample manifests live in the `k8s/` folder. Create a secret containing
`JWT_SECRET` before applying the manifests:

```bash
kubectl create secret generic jwt-secret --from-literal=JWT_SECRET=change_me
kubectl apply -f k8s/
```

This will deploy the backend, frontend and ingress resources.

## Running tests

- **backend**: `cd backend && npm test`
- **frontend unit tests**: `cd frontend && npm run test`
- **frontend e2e tests**: `cd frontend && npm run test:e2e`

Both test suites use Vitest and enforce a minimum of 80% code coverage. The backend
installs Vite only so Vitest can bundle modules during testing; the runtime and production
build do not depend on Vite. backend tests spin up a temporary MongoDB using `mongodb-memory-server`, which
downloads a MongoDB binary the first time it runs. Make sure network access is
allowed when running the tests for the first time or the download will fail.
See [backend/tests/README.md](backend/tests/README.md) for more details about
the download requirement. All pull requests must have a green CI run before
they can be merged. The testing matrix and workflow are described in
[docs/testing.md](docs/testing.md).

## Offline queue

The frontend stores any API requests made while offline in local storage. When
the browser regains connectivity, the queued requests are automatically sent
using the browser's `online` event even if the WebSocket defined by `VITE_WS_URL` and `VITE_SOCKET_PATH` fails to reconnect.

## License

This project is licensed under the [MIT License](LICENSE).


## Dashboard Acceptance Tests

- Real numbers load with API running.
- Live Data ON updates KPIs within 5 s on backend changes.
- Socket outage triggers polling within 10 s.
- Live Data OFF disables socket and polling.
- CSV/PDF export produces correct files.
- Layout customization persists after reload.
- Drill-through links apply correct filters.

## Auth & Users

### Backend auth endpoints

- `POST /api/auth/login` – email/password login, returns JWT + user profile.
- `GET /api/auth/me` – returns current authenticated user.
- `POST /api/auth/logout` – clears auth cookies/session state.
- `GET /api/users` – admin-only user list.
- `POST /api/users` – admin-only user creation (`name`, `email`, `trade`, `employeeNumber`, `startDate`, `role`, `password`).
- `PATCH /api/users/:id` – admin-only user update.
- `PATCH /api/users/:id/deactivate` – admin-only soft deactivate (`isActive=false`).
- `GET /api/admin/users` / `POST /api/admin/users` / `PATCH /api/admin/users/:id` – admin team-user management endpoints used by the frontend admin UI.

### Required auth env vars

Backend:
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `REFRESH_TOKEN_SECRET` (optional)
- `REFRESH_EXPIRES_IN` (optional)
- `ADMIN_SEED_EMAIL`
- `ADMIN_SEED_PASSWORD`
- `ADMIN_SEED_NAME`
- `CORS_ORIGIN`
- `FRONTEND_URL`

Frontend:
- `VITE_API_URL`
- `VITE_AUTH_TOKEN_STORAGE`

### Create first admin user

Option A (automatic on startup):
1. Set `ADMIN_SEED_EMAIL`, `ADMIN_SEED_PASSWORD`, and `ADMIN_SEED_NAME` in `backend/.env`.
2. Start backend once; it seeds an admin if no admin user exists.

Option B (manual script):
```bash
cd backend
npm run seed:default-admin
```

### Frontend auth routes

- `/login` – email/password login page.
- `/admin/users` – admin user management table + create/edit/deactivate.
