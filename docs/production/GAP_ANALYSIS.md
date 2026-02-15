# Production Gap Analysis

## Security
- ✅ Helmet enabled.
- ✅ CORS allowlist enforced and wildcard blocked in production.
- ✅ API/mobile rate limits present.
- ⚠️ Request validation exists in many routes, but not yet fully standardized across every endpoint.

## Reliability / health
- ✅ Added `/health` and `/ready` as root-level probe endpoints.
- ✅ Added `/metrics` for Prometheus scraping.

## Logging / tracing
- ✅ Structured JSON logging already used (winston).
- ✅ Added request correlation id propagation (`x-request-id`).
- ⚠️ Distributed tracing (OpenTelemetry) not yet implemented.

## CI/CD
- ✅ CI gates for lint/typecheck/test/build on backend and frontend.
- ✅ Build artifacts upload enabled.

## Containers
- ✅ Multi-stage Docker builds.
- ✅ Non-root runtime user.
- ✅ Container `HEALTHCHECK`.
- ⚠️ Read-only root filesystem can be enabled at orchestrator level (k8s `securityContext.readOnlyRootFilesystem`).

## Database readiness
- ✅ Added index definitions for WorkOrder and existing Asset indexes.
- ✅ Added `indexes:ensure` script.
- ⚠️ Backups are operational procedure, documented only.

## Secrets
- ✅ `.env.production.sample` with placeholders only.
- ✅ Kubernetes overlay references secret objects only.
- ⚠️ External secret manager integration remains environment-specific.
