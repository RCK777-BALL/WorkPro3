# frontend Production Readiness

## Required env
- `VITE_API_URL` (required)
- `VITE_WS_URL` (optional)
- `VITE_SOCKET_PATH` (optional)

## Build-time validation
`npm --prefix frontend run build` now validates required env vars before Vite build.

## Error handling
App includes error boundary components for user-friendly fallback UI.

## Token storage note
If JWTs are in localStorage, treat as XSS-sensitive; prefer short token TTL and rotation strategy.

## Smoke tests
- `npm --prefix frontend run test:e2e`
- Includes login/dashboard/assets route-load smoke checks.
