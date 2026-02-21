# Test Suite Remediation Task

## Summary
backend and frontend test commands fail before running any suites because the Jest and Vitest CLIs are missing from the current environment. We need to restore the Node tooling, rerun the suites, and fix any test breakages that surface (including snapshot updates, undefined references, or missing fixtures).

## Observed Failures
- `npm test -- --runInBand` exits with `sh: 1: jest: not found`, so the backend suite cannot start.
- `npm test --prefix frontend` exits with `sh: 1: vitest: not found`, preventing the frontend suite from running.

## Actionable Task
- Restore test tooling by reinstalling dependencies (e.g., `npm ci` in the repo root and `npm ci --prefix frontend` if needed) so that Jest and Vitest binaries are available.
- After dependencies are restored, rerun `npm test -- --runInBand` and `npm test --prefix frontend` to surface actual test failures (snapshots, undefined imports, or runtime errors).
- Resolve any failing specs by fixing code, test data, or snapshots, and ensure both commands exit successfully in CI and locally.

## Acceptance Criteria
- `npm test -- --runInBand` runs to completion without missing-binary errors and passes or reports actionable test failures that are addressed.
- `npm test --prefix frontend` runs to completion with Vitest available and passes after resolving any surfaced failures.
- CI can execute both commands without additional manual setup.
