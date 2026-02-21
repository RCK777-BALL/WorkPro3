# Project audit & onboarding procedure

This guide merges the current setup instructions with a lightweight audit of
how the repository is structured so new contributors can quickly understand the
system and get productive.

## Project audit (current state)

### Architecture snapshot

- **frontend**: React + Vite single-page app in `frontend/`.
- **backend**: Express API server in `backend/` (canonical backend path), backed
  by MongoDB with Socket.IO for real-time updates.
- **Development support**: `dev-server/` for lightweight frontend development,
  and `archives/` for historical backends kept for reference.

### Core services and dependencies

- **MongoDB**: Required for the API. Default connection targets
  `mongodb://localhost:27017/WorkPro3`, or override via `MONGO_URI`.
- **WebSockets**: Socket.IO on the backend, configured with
  `VITE_WS_URL` and `VITE_SOCKET_PATH` on the frontend.
- **Optional messaging**: Kafka can back the event queue; it can be disabled in
  non-Kafka deployments via environment flags.
- **Auth**: JWT stored in an HTTP-only cookie. OAuth/OIDC and SCIM are supported
  for SSO/JIT provisioning when enabled via environment variables.
- **Testing**: Vitest is used across backend and frontend, with an 80% coverage
  threshold in CI.

### Data bootstrapping

- Seed scripts (`npm run seed:admin`, `npm run seed`) provide a default tenant
  and admin user plus demo data (inspections, PM schedule, etc.).
- The default seeded admin login is `admin@example.com` with password
  `admin123` (override via `ADMIN_DEFAULT_PASSWORD`).

### Known operational touchpoints

- API docs are served at `/docs` in the backend.
- The frontend dev server runs at `http://localhost:5173`.
- The backend dev server defaults to port `5010` (override via `PORT`).

## Onboarding procedure

### 0) Prerequisites

- Node.js (latest LTS recommended).
- MongoDB running locally or via Docker.
- Optional: Docker + Docker Compose if you prefer containerized local services.

### 1) Clone and install dependencies

```bash
git clone <repo>
cd WorkPro3
```

Install dependencies in each package:

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 2) Configure environment variables

Copy the root sample file and update required variables:

```bash
cp .env.sample .env
```

Minimum values to set:

- `JWT_SECRET`
- `MONGO_URI`
- `CORS_ORIGIN`
- `FRONTEND_URL`

For frontend local development, copy the same sample to `.env.local`:

```bash
cd frontend
cp ../.env.sample .env.local
```

Confirm the following are aligned with your backend:

- `VITE_API_URL=http://localhost:5010`
- `VITE_WS_URL=ws://localhost:5010`
- `VITE_SOCKET_PATH=/socket.io`

### 3) Seed the database (first time only)

```bash
cd backend
npm run seed:admin
npm run seed
```

### 4) Start the backend

```bash
cd backend
npm run dev
```

### 5) Start the frontend

```bash
cd frontend
npm run dev
```

Open `http://localhost:5173` and log in with the seeded admin credentials.

### 6) Optional: Docker-based setup

If you prefer Docker, generate MongoDB TLS materials and then run:

```bash
./scripts/generate-mongo-tls.sh
# create .env with secrets and run
# docker compose up --build
```

### 7) Run tests (when ready)

```bash
cd backend && npm run test:coverage
cd ../frontend && npm run test:coverage
```

### 8) First-week checks

- Verify you can log in and see seeded data (work orders, inspections, PM
  schedule).
- Visit `/docs` on the backend to confirm API documentation loads.
- Confirm Socket.IO updates by modifying a record and watching the UI refresh.

## Troubleshooting quick hits

- **Auth failures**: Ensure `JWT_SECRET` is set and consistent with your backend
  `.env`.
- **CORS errors**: Verify `CORS_ORIGIN` includes `http://localhost:5173`.
- **WebSocket issues**: Validate `VITE_WS_URL` and `VITE_SOCKET_PATH`.
- **Seed failures**: Make sure MongoDB is running and `MONGO_URI` points to the
  correct database.
