# Contributing to WorkPro3

## Local Development
1. Install Node.js (>=18).
2. Run `npm ci` in the repo root to install dependencies for backend and frontend.
3. Start backend: `npm run dev --prefix backend`.
4. Start frontend: `npm run dev --prefix frontend`.

## Branching
- Create feature branches from `main`.
- Use descriptive branch names (e.g., `feature/work-orders-api`).

## Pull Request Checklist
- [ ] All new/changed files include SPDX license headers when required.
- [ ] Env changes documented in `.env.sample` files.
- [ ] New endpoints are documented in `docs/API.md`.
- [ ] frontend and backend use shared types from `/shared`.
- [ ] Tests and linters run cleanly.

## Coding Conventions
- Follow `/docs/CODING_STANDARDS.md`.
- Prefer small, focused commits.
- Use descriptive function and variable names.
