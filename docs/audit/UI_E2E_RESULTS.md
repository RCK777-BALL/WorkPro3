# frontend Feature / E2E Audit Results

## Setup attempted
- Existing frontend Playwright tests found in `frontend/playwright/*.spec.ts`.
- Added npm script `test:e2e` and executed `npm run test:e2e -- --list`.

## Result
- E2E listing/execution failed before browser launch due test environment/module setup conflicts:
  - `jest-axe` export mismatch (`toHaveNoViolations`)
  - `file-saver` named export mismatch (`saveAs`)
  - repeated vitest matcher redefinition errors
  - `import.meta.env.VITE_API_URL` undefined in test bootstrap path
- Playwright reported `No tests found` after loader/runtime errors.

## Manual flow status
Because backend DB connectivity was unavailable and frontend test/runtime harness is currently unstable, end-to-end UI flows could not be fully validated in this environment:
- Login → dashboard: blocked by backend DB unavailability
- Assets CRUD: not validated E2E
- Work orders list/filter/create/status/export: not validated E2E
- PM scheduler WO generation: not validated E2E
- Vendors/PO lite: not validated E2E

## Recommendation
- Isolate Playwright config from vitest/jest setup files and ensure `.env` values are injected for Playwright runtime.
- Stand up reachable MongoDB (local/docker) before full UI flow verification.
