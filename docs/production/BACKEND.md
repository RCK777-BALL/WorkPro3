# Backend Production Notes

## Security defaults
- Helmet enabled.
- CORS origin allowlist from `CORS_ORIGIN`.
- Wildcard origin forbidden in `NODE_ENV=production`.
- Rate limits on general API and mobile/auth paths.

## Health and metrics
- `GET /health` basic process health.
- `GET /ready` DB-readiness check.
- `GET /metrics` Prometheus-compatible metrics.

## Error shape
Centralized error handler returns:
- `code`
- `message`
- `details`
- `requestId`

## Auth hardening
- `JWT_SECRET` required in production.
- `JWT_SECRET` minimum length: 32 characters in production.
