# Backend API Smoke Results

Smoke execution used `NODE_ENV=test` + `supertest` against `backend/server.ts` app instance (no DB connection bootstrap in test mode).

## Endpoint checks

| Endpoint | Auth expectation | Result | Notes |
|---|---|---:|---|
| `GET /health` | public | 200 | returns health payload |
| `GET /api/health` | public | 200 | returns API health payload |
| `POST /api/auth/login` | public | 500 | DB unavailable (mongoose buffering timeout) |
| `GET /api/summary` | JWT required | 401 | expected when unauthenticated |
| `GET /api/assets` | JWT required | 401 | expected when unauthenticated |
| `GET /api/workorders` | JWT required | 401 | expected when unauthenticated |
| `GET /api/pm-tasks` | JWT required | 401 | expected when unauthenticated |
| `GET /api/vendors` | JWT required | 401 | expected when unauthenticated |
| `GET /api/purchase-orders` | JWT required | 401 | expected when unauthenticated |
| `GET /api/analytics` | JWT required | 401 | expected when unauthenticated |

## Common failure mode observed
- DB-backed public routes (`/api/auth/login`) return 500 when MongoDB is unavailable.
- Majority of protected routes correctly return 401 without valid auth.

## Missing endpoint handling
- `/health` and summary endpoints already exist; no endpoint creation required.
