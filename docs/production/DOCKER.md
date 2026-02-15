# Docker Production Baseline

## Images
- `backend/Dockerfile`: multi-stage Node 20 Alpine, non-root runtime, healthcheck.
- `frontend/Dockerfile`: Vite build stage + nginx runtime, non-root, healthcheck.

## Compose
- `docker-compose.prod.yml` includes `mongo`, `backend`, `frontend`.
- Use `.env.production.sample` as template; inject real secrets at deploy time.
