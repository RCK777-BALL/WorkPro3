# Build and Quality Results

## Install
- Root `npm ci` ❌ failed due lockfile mismatch in nested `backend`/`frontend` via postinstall.
- `backend`: `npm install` ✅
- `frontend`: `npm install` ✅

## Lint
- `cd backend && npm run lint` ✅ (warnings only)
- `cd frontend && npm run lint` ✅ (warnings only)

## Typecheck
- `cd backend && npm run typecheck` ❌
  - Notable errors: `inspectionRoutes.ts` object id cast, `tasks/executiveReports.ts` cron parser API, `types/http.ts` User export.
- `cd frontend && npm run build` includes TS noEmit and currently fails due backend-shared type issues referenced by frontend config.

## Unit/Integration tests
- Root `npm test -- --runInBand` ❌
  - `tests/integration/*` expected `/usr/bin/mongod`; binary unavailable.
- `cd backend && npm test` ❌
  - Multiple suites fail or skip because mongodb-memory-server download URL returns 403 for pinned Mongo binaries.
- `cd frontend && npm test` ❌
  - Many failing tests (offline queue assertions, missing providers/router wrappers, jest-dom matcher setup issues in some suites).

## Build
- `cd backend && npm run build` ❌
  - Still failing with pre-existing TypeScript errors in controllers/middleware typing.
- `cd frontend && npm run build` ❌
  - Fails because backend typing issues leak into compile target and `backend/types/http.ts` incompatibilities.

## Minimal script additions made
- Added `frontend` script: `test:e2e` → `playwright test` to expose existing Playwright suite through npm scripts.
