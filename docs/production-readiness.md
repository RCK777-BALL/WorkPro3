# Production Readiness Guide

This repo now includes production-grade defaults plus the additional guardrails that commonly break first in real deployments. Use this document as the authoritative checklist for go-live.

## 1) Configuration & secrets (must-have)

- Store secrets outside Git. Use Kubernetes Secrets or an external secrets manager.
- Required env (production):
  - Backend: `MONGO_URI`, `JWT_SECRET` (or `JWT_ACCESS_SECRET`), `CORS_ORIGIN`, `FRONTEND_URL`
  - Frontend: `VITE_API_URL`, `VITE_WS_URL`, `VITE_SOCKET_PATH`
- Optional token hardening:
  - `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
  - `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`

## 2) Security hardening (must-have)

- Password policy is enforced via `PASSWORD_*` settings in `Backend/config/securityPolicies.ts`.
- Login lockouts are enforced via `LOGIN_LOCKOUT_*` (see `.env.sample`).
- Short-lived access tokens + refresh token rotation are enabled in `/api/auth/login` and `/api/auth/refresh`.
- RBAC is enforced server-side via `requirePermission` middleware (do not rely on UI role hiding).
- CORS must be locked to production origins via `CORS_ORIGIN`.

## 3) Reliability: DB, backups, migrations (must-have)

- Mongo connection pooling + timeouts are configurable via `MONGO_*` envs (see `.env.sample`).
- Backups:
  - Managed: Atlas snapshots + PITR.
  - Self-hosted: `k8s/jobs/mongo-backup-cronjob.example.yaml`.
- Migrations:
  - Migration runner: `cd backend && npm run migrate` (supports `--dry-run` and `--list`).
  - Existing scripts live in `Backend/scripts/migrations` and now export `run()` so they are tracked in the `migrations` collection.
  - Do not run ad-hoc in production without a recorded run/rollback plan.

## 4) Observability (must-have)

- Structured JSON logs (Winston) with request IDs.
- Prometheus metrics at `/metrics` with request latency and totals.
- Health endpoints:
  - `/api/health/live`
  - `/api/health/ready` (depends on MongoDB connection)

## 5) Background jobs & scheduling (must-have)

- PM scheduler and reminder jobs are protected by distributed Mongo locks to avoid duplicate execution in multi-pod deployments.
- Configure lock TTLs via `JOB_LOCK_TTL_MS`, `PM_SCHEDULER_LOCK_TTL_MS`, and `REMINDER_JOB_LOCK_TTL_MS`.

## 6) Offline mode (strongly recommended)

- Offline queue includes per-action IDs, retries with backoff, and conflict resolution.
- Offline requests send `Idempotency-Key` headers; server enforces idempotency via Mongo-backed key storage.
- UI exposes Pending / Syncing / Retrying / Failed states with manual replay.

## 7) CI/CD + quality gates (recommended)

- CI runs lint, typecheck, build, and test coverage on PRs.
- Add container/image scanning + dependency audit in your deployment pipeline (recommended for enterprise compliance).

## 8) Kubernetes production readiness (recommended)

- TLS + ingress hostnames via overlays (`k8s/overlays/*`).
- Resource requests/limits + HPA included.
- PodDisruptionBudgets included (`k8s/pdb.yaml`).
- Separate namespaces for dev/prod (`k8s/overlays/*/namespace.yaml`).
- External Secrets Operator examples available (`k8s/external-secrets/example.yaml`).
