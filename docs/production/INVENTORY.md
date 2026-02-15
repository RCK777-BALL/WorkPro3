# WorkPro3 Production Inventory

## Monorepo layout
- `backend/`: Express + MongoDB API server.
- `frontend/`: Vite + React SPA.
- `k8s/`: Kubernetes base manifests.
- `docker/`: Mongo bootstrap/init helpers.

## Required environment variables
### Backend
- `NODE_ENV`, `PORT`, `MONGO_URI`, `JWT_SECRET`, `CORS_ORIGIN`
- Rate limit: `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`, `MOBILE_RATE_LIMIT_WINDOW_MS`, `MOBILE_RATE_LIMIT_MAX`
- Scheduling/ops: `PM_SCHEDULER_CRON`, `PM_SCHEDULER_TASK`, `EXECUTIVE_REPORT_CRON`, `REORDER_SUGGESTION_CRON`, `REORDER_ALERT_CRON`

### Frontend
- `VITE_API_URL` (required for production builds)
- `VITE_WS_URL` (optional)
- `VITE_SOCKET_PATH` (optional, defaults to `/socket.io`)

## Ports and URLs
- Backend HTTP: `5010` by default.
- Frontend HTTP: `80` in container (`8080` when mapped in compose).
- Health endpoints: `/health`, `/ready`
- Metrics endpoint: `/metrics`
- Socket path: `/socket.io`

## Current deployment approach
- Dockerfiles for backend/frontend.
- `docker-compose.yml` (existing dev) and `docker-compose.prod.yml` (added prod baseline).
- Kubernetes manifests under `k8s/` plus prod overlay under `k8s/overlays/prod`.

## Existing scripts
### Root
- `lint`, `typecheck`, `test:unit`, `build`, `build:backend`, `build:frontend`

### Backend
- `dev`, `build`, `start`, `lint`, `typecheck`, `test`, `indexes:ensure`

### Frontend
- `dev`, `build`, `lint`, `typecheck`, `test`, `test:e2e`
