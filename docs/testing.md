# Testing

This project uses [Vitest](https://vitest.dev) for both backend and frontend tests.

## Test Matrix

| Layer | backend | frontend |
| --- | --- | --- |
| Unit | Model and utility tests | Component and store tests |
| Integration | API routes with MongoDB memory server | DOM interactions through jsdom |
| Offline/Sync | n/a | offline queue and sync flows |

Both packages provide seed helpers so tests can create realistic data.

## Continuous Integration

GitHub Actions runs `npm run test:coverage` for the backend and frontend on every pull request. The configuration enforces a minimum of 80% coverage across lines, functions, branches and statements. A green CI run is required before merging.
