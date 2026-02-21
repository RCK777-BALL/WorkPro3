# Login Flow Completion Checklist

The login experience spans both the backend auth routes and the frontend session bootstrap. The following checklist captures the concrete work needed to finish and harden the current implementation before it can ship.

## 1. backend authentication API
- [ ] Confirm the `/api/auth/login` route receives a JSON body containing both `email` and `password`, matching the `loginSchema` validation contract so it stops returning `400 Bad Request` for missing fields. Include the seeded admin credentials (`admin@cmms.com` / `Password123!`) in the request during sanity checks and verify the request uses the `Content-Type: application/json` header.【F:backend/routes/AuthRoutes.ts†L59-L143】
- [ ] Double-check local environment configuration so the frontend points to the correct backend host (e.g., `VITE_API_URL=http://localhost:5010` in `.env.local`) before retesting the login flow to eliminate cross-origin or misrouted calls.【F:frontend/src/pages/Login.tsx†L32-L74】
- [ ] Restore the missing imports and constants in `backend/routes/AuthRoutes.ts` (Express request types, `passport`, `bcrypt`, `jwt`, the auth rate limiters, `User`, `FAKE_PASSWORD_HASH`, `getJwtSecret`, `logger`, etc.) so the inline `/login` handler compiles again.【F:backend/routes/AuthRoutes.ts†L1-L123】
- [ ] Decide on a single `/login` implementation—either keep the inline handler or the controller-based `login` exported from `backend/controllers/authController.ts`—and remove the duplicate registration at the bottom of the router to prevent divergent behavior.【F:backend/routes/AuthRoutes.ts†L59-L213】【F:backend/controllers/authController.ts†L116-L181】
- [ ] Make the login handler load hashed credentials from the correct field (`passwordHash`) and update seed/test utilities that still write to a plain `password` property.【F:backend/routes/AuthRoutes.ts†L69-L103】【F:frontend/src/test/auth.e2e.test.ts†L32-L57】
- [ ] Align the status codes and error payloads that the route returns for bad credentials with what the e2e tests expect (currently `401` vs `400`) and document the contract for consumers.【F:backend/routes/AuthRoutes.ts†L76-L102】【F:frontend/src/test/auth.e2e.test.ts†L37-L51】
- [ ] Ensure the JSON response shape matches what the frontend `AuthContext.login` parser accepts (`{ mfaRequired: true }` for MFA or `{ user, token? }`/`{ data: { user, token? } }` otherwise).【F:backend/routes/AuthRoutes.ts†L104-L143】【F:frontend/src/context/AuthContext.tsx†L206-L273】
- [ ] Wire the remember-me flag into cookie/session persistence by keeping the existing `maxAge` logic and verifying the secure/same-site options through automated tests.【F:backend/routes/AuthRoutes.ts†L130-L143】【F:frontend/src/pages/Login.tsx†L41-L71】

## 2. Session lifecycle & security
- [ ] Standardize on a single helper for issuing auth cookies/tokens (e.g., `setAuthCookies`) and ensure refresh/logout endpoints reuse it alongside the remember-me semantics.【F:backend/routes/AuthRoutes.ts†L130-L214】【F:backend/controllers/authController.ts†L214-L294】
- [ ] Audit logging to record failed logins without leaking passwords while still surfacing operational alerts for brute force attempts.【F:backend/routes/AuthRoutes.ts†L144-L213】
- [ ] Verify that `isCookieSecure` and related config honor development vs production environments, updating `.env.example` or deployment charts as needed.【F:backend/controllers/authController.ts†L1-L120】

## 3. frontend experience
- [ ] Surface backend validation and authentication errors directly in the login form instead of the current generic message so users know why the attempt failed.【F:frontend/src/pages/Login.tsx†L45-L74】
- [ ] Ensure a successful login hydrates local storage (`TOKEN_KEY`, `TENANT_KEY`, `SITE_KEY`) exactly once and clears stale values on logout/reset to avoid partial sessions.【F:frontend/src/context/AuthContext.tsx†L250-L320】
- [ ] Add instrumentation or analytics hooks around login attempts to monitor success/failure funnels if required by product/ops.【F:frontend/src/context/AuthContext.tsx†L206-L273】

## 4. Automated testing
- [ ] Expand the backend test matrix to cover MFA-required users, missing password hashes, and repeated failure lockouts so regressions surface immediately.【F:backend/routes/AuthRoutes.ts†L95-L123】【F:frontend/src/test/auth.e2e.test.ts†L37-L57】
- [ ] Create a contract/integration test that exercises the full stack by calling the real `/api/auth/login` through the frontend client and asserting on stored session data.【F:frontend/src/context/AuthContext.tsx†L206-L320】
- [ ] Update the Playwright/Vitest suites to navigate through `/login`, submit forms, and validate redirects plus remember-me persistence across reloads.【F:frontend/src/pages/Login.tsx†L32-L74】

## 5. Documentation & handoff
- [ ] Document the expected request/response schema for `POST /api/auth/login` (headers, body, cookies) in the public API reference so integrators stay aligned.【F:backend/routes/AuthRoutes.ts†L59-L143】
- [ ] Add runbooks for common failure scenarios (locked accounts, missing cookies, MFA) and tie them into the on-call checklist.【F:backend/routes/AuthRoutes.ts†L104-L213】
- [ ] Publish regeneration steps for any seeded login fixtures so QA/UAT environments stay in sync with the schema changes.【F:frontend/src/test/auth.e2e.test.ts†L32-L57】
