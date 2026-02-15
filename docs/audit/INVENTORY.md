# WorkPro3 Inventory

## Applications / packages
- `backend/` (canonical backend API in README)
- `frontend/` (canonical React/Vite frontend)
- `shared/` (shared types/validators, no full app scripts)
- Root package (`/`) for integration tests + helper scripts
- `Backend/` and `Frontend/` (archived/alternate tree; not canonical per README)

## Scripts by package

### Root (`package.json`)
- `npm test` → Jest integration suite (`tests/integration/*`)
- `npm run fix:backend`
- `npm run fix:frontend`
- `npm run fix:all`

### backend (`backend/package.json`)
- Build: `npm run build`
- Dev server: `npm run dev`
- Start compiled: `npm run start`
- Lint: `npm run lint`
- Typecheck: `npm run typecheck`
- Test: `npm test` / `npm run test:coverage`
- Seeds: `npm run seed`, `npm run seed:admin`, `npm run seed:default-admin`, `npm run seed:team`, `npm run seed:departments`, `npm run reset-db`

### frontend (`frontend/package.json`)
- Dev: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`
- Unit tests: `npm test`
- E2E tests: `npm run test:e2e` (added in this audit)
- Preview: `npm run preview`

### shared (`shared/package.json`)
- No scripts (only `type: commonjs`)

## Environment variables (from sample env files)

### Required (core)
- Backend: `JWT_SECRET`, `MONGO_URI`, `CORS_ORIGIN`
- Frontend: `VITE_API_URL`, `VITE_WS_URL`, `VITE_SOCKET_PATH`

### Additional backend envs found
- `PORT`, `NODE_ENV`, `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`
- Token envs in `backend/.env.example`: `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `ACCESS_TOKEN_TTL`, `REFRESH_TOKEN_TTL`, `COOKIE_DOMAIN`
- Optional scheduler/integration envs in `.env.sample` (Kafka/SMTP/Redis/OAuth/etc.)

## Ports / URLs / socket paths
- Backend API default: `http://localhost:5010`
- Frontend dev default: `http://localhost:5173`
- API base URL: `VITE_API_URL` (default `http://localhost:5010`)
- WS URL: `VITE_WS_URL` (default `ws://localhost:5010`)
- Socket path: `VITE_SOCKET_PATH` (default `/socket.io`)

## Major backend routes discovered
- Health: `/health`, `/api/health`
- Auth: `/api/auth/*`
- Assets: `/api/assets/*`
- Work orders: `/api/workorders/*` and `/api/work-orders/*`
- PM: `/api/pm/*`, `/api/pm-tasks/*`
- Vendors / PO: `/api/vendors/*`, `/api/purchase-orders/*`, `/api/po/*`
- Summary/analytics: `/api/summary`, `/api/system/summary`, `/api/analytics/*`
