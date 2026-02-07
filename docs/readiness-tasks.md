# Production Readiness Tasks

The following task list tracks the remaining gaps called out in the readiness audit. Each section contains concrete tasks that should be owned and completed before go-live.

## 1) Secrets & environment configuration

- [ ] Provision production secrets in a secrets manager or Kubernetes Secrets (`JWT_SECRET`, `MONGO_URI`, `CORS_ORIGIN`, `FRONTEND_URL`).
- [ ] Populate frontend runtime config (`VITE_API_URL`, `VITE_WS_URL`, `VITE_SOCKET_PATH`) in the production environment.
- [ ] Validate the secret values against `.env.sample` and document where they live (vault path or K8s secret names).

## 2) Kubernetes overlays & TLS

- [ ] Update `k8s/overlays/prod/patch-ingress.yaml` with the production hostname.
- [ ] Create/update the TLS secret referenced by the prod ingress and verify certificate renewal (if using cert-manager).
- [ ] Apply the prod overlay to the correct namespace and verify ingress resolves to the correct services.

## 3) Images & tag immutability

- [ ] Build and push backend/frontend images in CI.
- [ ] Capture immutable image digests.
- [ ] Update `k8s/overlays/prod/kustomization.yaml` to pin the backend and frontend images to digests.
- [ ] Validate that no `:latest` or mutable tags are used in production manifests.

## 4) Database strategy & backups

- [ ] Decide on the MongoDB strategy (managed Atlas vs self-hosted replica set).
- [ ] If managed: enable PITR and snapshots; if self-hosted: deploy the replica set manifests and enable TLS.
- [ ] Configure and test the backup workflow (`k8s/jobs/mongo-backup-cronjob.example.yaml` or managed snapshots).
- [ ] Document restore steps and perform a restore test in a staging environment.

## 5) Migrations readiness

- [ ] Run `cd backend && npm run migrate -- --list` to confirm planned migrations.
- [ ] Execute the migration runner in staging and record the run in the migrations collection.
- [ ] Capture a rollback plan for each migration before production rollout.

## 6) CI/test coverage gates

- [ ] Ensure CI runs `npm run test:coverage` for both backend and frontend.
- [ ] Verify the 80% coverage thresholds are enforced in CI.
- [ ] Add build/lint/typecheck steps to CI if they are missing.
