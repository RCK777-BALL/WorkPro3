# Verification Logs

Populate this file per release with:
- CI run URL and result summary.
- Local outputs:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test:unit`
  - `npm run build`
- API checks:
  - `curl -f http://localhost:5010/health`
  - `curl -f http://localhost:5010/ready`
