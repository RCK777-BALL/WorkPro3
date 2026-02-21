# Admin Control Center Testing Status

## backend (`backend`)
- `npm install` fails due to `ENOTEMPTY` rename errors when preparing the existing node_modules tree.
- Installing additional packages (`vitest`) is blocked by a registry `403 Forbidden` response, so the Vitest CLI is not available in the container.
- Because of the missing Vitest binary, running `npm test -- adminSettingsRoutes.test.ts` exits with `sh: 1: vitest: not found`.

## frontend (`frontend`)
- Dependency installation is currently blocked by the same `403 Forbidden` registry policy, preventing Playwright from running.

## Next steps
1. Resolve the npm registry policy or provide cached `node_modules` containing Vitest/Playwright.
2. Re-run `npm test -- adminSettingsRoutes.test.ts` from the `backend` folder.
3. Execute `npx --prefix frontend playwright test` once frontend dependencies are installed.
