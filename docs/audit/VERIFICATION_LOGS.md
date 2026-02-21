# Verification Logs

## Commands executed
- `npm ci` (root) → failed due nested lockfile mismatch
- `cd backend && npm install` → pass
- `cd frontend && npm install` → pass
- `npm test -- --runInBand` (root) → fail (mongod system binary unavailable)
- `cd backend && npm run lint` → pass (warnings only)
- `cd backend && npm run typecheck` → fail
- `cd backend && npm test` → fail/skip heavy due mongodb-memory-server download 403
- `cd backend && npm run build` → fail (multiple TS errors remain)
- `cd frontend && npm run lint` → pass (warnings only)
- `cd frontend && npm test` → fail (multiple unit test issues)
- `cd frontend && npm run build` → fail (backend-shared TS issues)
- `cd frontend && npm run test:e2e -- --list` → fail (runtime/module/setup conflicts)
- `NODE_ENV=test node -r ./backend/node_modules/ts-node/register/transpile-only ...` supertest smoke run
  - `GET /health -> 200`
  - `GET /api/health -> 200`
  - `POST /api/auth/login -> 500` (db unavailable)
  - protected routes -> 401

## Key errors captured
- `No Binary at path "/usr/bin/mongod" was found` in root integration tests.
- `DownloadError ... fastdl.mongodb.org ... Status Code 403` in backend tests.
- frontend tests: provider/router setup failures + matcher/export conflicts.
