# Production Readiness Tasks

The following task list tracks the remaining gaps called out in the readiness audit. Each section contains concrete tasks that should be owned and completed before go-live.

## 0) Task tracking & ownership

- [ ] Assign an owner and backup for each readiness section.
- [ ] Add target completion dates and Jira/Linear ticket links for every task.
- [ ] Confirm each task has an acceptance checklist and sign-off criteria.
- [ ] Review progress weekly and mark items done with a linked evidence artifact (run logs, screenshots, or config snippets).

## 1) Secrets & environment configuration

- [ ] Provision production secrets in a secrets manager or Kubernetes Secrets (`JWT_SECRET`, `MONGO_URI`, `CORS_ORIGIN`, `FRONTEND_URL`).
- [ ] Populate frontend runtime config (`VITE_API_URL`, `VITE_WS_URL`, `VITE_SOCKET_PATH`) in the production environment.
- [ ] Validate the secret values against `.env.sample` and document where they live (vault path or K8s secret names).
- [ ] Confirm access policies for secrets (least-privilege roles, rotation schedule, and break-glass access).
- [ ] Run a config smoke test in staging with production-like values to verify API, CORS, and websocket connectivity.
- [ ] Record the rollout procedure for updating secrets without downtime.

## 2) Kubernetes overlays & TLS

- [ ] Update `k8s/overlays/prod/patch-ingress.yaml` with the production hostname.
- [ ] Create/update the TLS secret referenced by the prod ingress and verify certificate renewal (if using cert-manager).
- [ ] Apply the prod overlay to the correct namespace and verify ingress resolves to the correct services.
- [ ] Validate ingress annotations (timeouts, body size limits, websocket upgrades) against production requirements.
- [ ] Perform a staging deploy with the prod overlay to verify manifests apply cleanly and pods are healthy.
- [ ] Capture a DNS cutover plan, including rollback steps and expected propagation time.

## 3) Images & tag immutability

- [ ] Build and push backend/frontend images in CI.
- [ ] Capture immutable image digests.
- [ ] Update `k8s/overlays/prod/kustomization.yaml` to pin the backend and frontend images to digests.
- [ ] Validate that no `:latest` or mutable tags are used in production manifests.
- [ ] Record the provenance (CI run ID, commit SHA, SBOM link) for each production image digest.
- [ ] Run container vulnerability scanning and document any accepted risk exceptions.
- [ ] Verify rollout uses the pinned digests via `kubectl describe` or deployment status output.

## 4) Database strategy & backups

- [ ] Decide on the MongoDB strategy (managed Atlas vs self-hosted replica set).
- [ ] If managed: enable PITR and snapshots; if self-hosted: deploy the replica set manifests and enable TLS.
- [ ] Configure and test the backup workflow (`k8s/jobs/mongo-backup-cronjob.example.yaml` or managed snapshots).
- [ ] Document restore steps and perform a restore test in a staging environment.
- [ ] Define data retention and backup frequency targets that meet compliance requirements.
- [ ] Configure alerting on backup failures and replica set health (or Atlas alerts).
- [ ] Verify a point-in-time restore or snapshot restore meets the recovery time objective (RTO).

## 5) Migrations readiness

- [ ] Run `cd backend && npm run migrate -- --list` to confirm planned migrations.
- [ ] Execute the migration runner in staging and record the run in the migrations collection.
- [ ] Capture a rollback plan for each migration before production rollout.

## 6) CI/test coverage gates

- [ ] Ensure CI runs `npm run test:coverage` for both backend and frontend.
- [ ] Verify the 80% coverage thresholds are enforced in CI.
- [ ] Add build, lint, and typecheck steps to CI if they are missing.
- [ ] Enforce lint/typecheck/build as blocking quality gates (fail the pipeline on errors).
- [ ] Capture evidence links to the last green CI run for each gate (lint, typecheck, build, coverage).

## 7) Dashboard acceptance validation

- [ ] Validate dashboards against real data sets (production-like volume, multi-tenant, multi-site).
- [ ] Confirm live updates via sockets and verify polling fallback when sockets are disabled.
- [ ] Test exports (CSV/PDF) for accuracy, formatting, and permission filtering.
- [ ] Validate layout persistence across reloads and user sessions.
- [ ] Verify drill-through filters propagate correctly from dashboard widgets to underlying records.

## 8) Readiness completion plan

- [ ] Convert every unchecked item in sections 0–7 into a tracked ticket with a due date and owner.
- [ ] Schedule a readiness review meeting to validate evidence artifacts for each completed task.
- [ ] Capture sign-off for each section (0–7) and link approvals in this document.
- [ ] Publish a final readiness status update summarizing remaining risks and blockers.

## 9) High-level gap closure plan (items 1–7)

- [ ] **Production readiness gap closure (items 1–7)**: Execute the remaining must-have items across secrets/config, security hardening, reliability/data durability, observability, background jobs resilience, offline readiness, and dashboard validation. Track owners and evidence for each area, verify production configuration values, validate staging tests (CORS/websocket smoke, migration rehearsal, restore test), confirm observability endpoints and log shipping, and document operational runbooks for lock TTLs and conflict/idempotency handling.
