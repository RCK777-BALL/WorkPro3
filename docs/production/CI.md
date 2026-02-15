# CI Quality Gates

## GitHub Actions
Workflow: `.github/workflows/ci.yml`

Runs on push/PR and executes per app:
1. `npm ci`
2. `npm run lint`
3. `npm run typecheck`
4. `npm run test`
5. `npm run build`
6. Upload `dist/` and `coverage/` artifacts

## Run locally from repo root
- `npm run lint`
- `npm run typecheck`
- `npm run test:unit`
- `npm run build`
