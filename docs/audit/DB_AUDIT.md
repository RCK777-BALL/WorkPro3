# DB Audit

## MongoDB connectivity
- Backend startup is hard-gated on `mongoose.connect(MONGO_URI)` in non-test mode.
- In this environment, MongoDB-backed tests failed due unavailable `mongod` system binary and mongodb-memory-server download failures (HTTP 403 from fastdl.mongodb.org).

## Indexes and tenant scoping
- Tenant-aware middleware is present (`tenantResolver`, `tenantScope`, headers `x-tenant-id` and `x-site-id`).
- Protected API routes are wrapped by `requireAuth` + `tenantScope` for most `/api/*` routes.
- Observed duplicate index warning on `expiresAt` in some schemas during test runs.

## Seed behavior
- Seed scripts exist (`seed`, `seed:admin`, `seed:team`, `seed:departments`, etc.) but were not executable end-to-end without a running MongoDB.

## Relationship/cascade notes
- Hierarchy routers/models exist for departments, lines, stations, assets.
- Full cascade behavior could not be validated without successful DB integration test run.

## Auth middleware typing
- `backend/types/http.ts` typing mismatch caused compile instability.
- Audit fix applied to remove invalid `express-serve-static-core` `User` import and align auth user shape with `Express.User`.
