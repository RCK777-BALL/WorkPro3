# Production release tasks

Use this checklist to complete the production readiness items before applying manifests.

## Secrets and environment alignment
- [ ] Enumerate required backend and frontend environment variables from `.env` and Kubernetes manifests.
- [ ] Verify `.env` values match the Kubernetes Secret keys referenced in the deployment manifests.
- [ ] Confirm `k8s/secrets.yaml` (or external secret source) is populated with the required values and stored out of Git.
- [ ] Validate that `ConfigMap` values for frontend runtime config (e.g., `VITE_API_URL`, `VITE_WS_URL`, `VITE_SOCKET_PATH`) are present and correct.

## Production ingress, TLS, and hostnames
- [ ] Review `k8s/overlays/prod/patch-ingress.yaml` and confirm production hostnames match DNS.
- [ ] Confirm TLS secret name in the prod overlay matches the provisioned certificate secret.
- [ ] Validate that any cert-manager issuer annotations are correct for production.

## Image immutability and pipeline guards
- [ ] Build and push production images and capture SHA256 digests.
- [ ] Update `k8s/overlays/prod/kustomization.yaml` to use the exact image digests.
- [ ] Add/verify CI pipeline rules that block `:latest` tags for production deploys.

## Database migrations and backups
- [ ] Run `npm run migrate` in the backend service against the production database.
- [ ] Confirm backup job is scheduled (CronJob for self-hosted) or Atlas PITR is enabled.
- [ ] Validate backup storage credentials and retention policies.

## Tests and acceptance checks
- [ ] Run the full test suite and resolve failures before release.
- [ ] Run acceptance checks (smoke tests, API health checks, and critical user flows).
- [ ] Capture and archive test results in release notes or CI artifacts.
