# CI Frontend Coverage Task

## Summary
CI currently skips frontend test coverage, even though the documentation states that `npm run test:coverage` should run for both backend and frontend on every pull request. This task ensures the CI workflow executes frontend coverage tests so regressions are blocked before merge.

## Actionable Task
- Update the GitHub Actions CI workflow to run `npm run test:coverage` (or the appropriate frontend coverage command) after install/typecheck/build steps in the frontend job.
- Ensure the job uses the correct working directory and caches dependencies, matching the existing frontend steps.
- Confirm that the backend coverage job still runs as documented and that the workflow fails when frontend coverage fails.

## Acceptance Criteria
- Pull request runs include a frontend `npm run test:coverage` step in CI.
- CI fails when frontend coverage or frontend tests fail.
- Documentation and CI behavior are aligned (no mismatch between `docs/testing.md` and `.github/workflows/ci.yml`).
