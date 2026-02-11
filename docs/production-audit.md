# Production Release Audit

## Scope

This audit reviews the current repo configuration, documentation, and deployment artifacts to gauge readiness for a production release. Findings are based on the repo state only (no runtime validation).

## Ready/Implemented Signals

- **Production readiness guidance exists** and covers secrets, security hardening, observability, background jobs, offline mode, CI/CD, and Kubernetes deployment guidance. See `docs/production-readiness.md` for the canonical checklist. 【F:docs/production-readiness.md†L1-L52】
- **Environment variables are documented** in `.env.sample`, including required production values (JWT, Mongo, CORS, frontend URLs) and optional hardening parameters (lockouts, token TTLs, job locks). 【F:.env.sample†L1-L76】
- **Kubernetes production overlays are in place**, including namespace, ingress patching, config map patching, and image digest pinning structure. 【F:k8s/overlays/prod/kustomization.yaml†L1-L13】
- **Deployment notes** describe secrets, TLS, image tagging, health probes, and MongoDB strategies. 【F:k8s/README-production.md†L1-L143】
- **Testing expectations are documented**, including coverage gates and local commands for backend/frontend tests. 【F:docs/testing.md†L1-L26】

## Gaps / Actions Required Before Production

### 1) Replace placeholder production values
- **Production overlay values are placeholders** (ingress hostnames and image digests). Update `k8s/overlays/prod/patch-ingress.yaml` and `k8s/overlays/prod/kustomization.yaml` before release. 【F:k8s/overlays/prod/patch-ingress.yaml†L1-L11】【F:k8s/overlays/prod/kustomization.yaml†L1-L13】
- **Frontend runtime config placeholders** need real URLs in `k8s/overlays/prod/patch-configmap.yaml`. 【F:k8s/overlays/prod/patch-configmap.yaml†L1-L8】

### 2) Secrets management must be finalized
- The repo explicitly requires production secrets for JWT, Mongo, and CORS/Frontend URL; these must be provided in your secret store prior to deployment. 【F:.env.sample†L1-L24】
- Kubernetes guidance confirms secrets must be created outside Git and warns against applying example manifests as-is. 【F:k8s/README-production.md†L1-L57】

### 3) Validate operational readiness
- The production readiness guide lists required security, observability, and reliability requirements. Ensure each item is validated in your environment (e.g., health probes, metrics, login lockouts, backup strategy). 【F:docs/production-readiness.md†L1-L52】
- Run the documented test suites before release to validate coverage and stability. 【F:docs/testing.md†L1-L26】

## Recommended Release Checklist (Actionable)

1. **Configure secrets** in your secret manager or Kubernetes secrets (JWT, Mongo, CORS, frontend URL). 【F:.env.sample†L1-L24】【F:k8s/README-production.md†L1-L57】
2. **Update production overlays** with real hostnames, TLS secret, and immutable image digests. 【F:k8s/overlays/prod/patch-ingress.yaml†L1-L11】【F:k8s/overlays/prod/kustomization.yaml†L1-L13】
3. **Update frontend runtime config** in the production config map. 【F:k8s/overlays/prod/patch-configmap.yaml†L1-L8】
4. **Verify production readiness checklist** in `docs/production-readiness.md` and ensure each line item is validated in your target cluster. 【F:docs/production-readiness.md†L1-L52】
5. **Run backend and frontend test coverage suites** as described. 【F:docs/testing.md†L1-L26】

## Task Configuration (Gaps 1–4)

Use this task list to drive completion of the first four gaps identified above. Each task is meant to be owned, tracked, and validated before production release.

### Gap 1: Replace placeholder production values

- [ ] **Task 1.1: Update production ingress hostnames**
  - Edit `k8s/overlays/prod/patch-ingress.yaml` to set the production domain and TLS secret.
  - Validate DNS points to ingress and TLS cert is issued.
  - Evidence: `kubectl describe ingress workpro-ingress -n workpro-prod` shows correct hosts and TLS secret. 【F:k8s/overlays/prod/patch-ingress.yaml†L1-L11】
- [ ] **Task 1.2: Pin immutable production image digests**
  - Build and publish `workpro-backend` and `workpro-frontend` images.
  - Replace placeholder digests in `k8s/overlays/prod/kustomization.yaml`.
  - Evidence: `kubectl get deploy -n workpro-prod -o yaml` shows digests. 【F:k8s/overlays/prod/kustomization.yaml†L1-L13】

### Gap 2: Finalize secrets management

- [ ] **Task 2.1: Create production application secrets**
  - Store JWT, Mongo, CORS, and frontend URL values in a secret manager or Kubernetes Secret.
  - Evidence: secret exists in `workpro-prod` namespace and is referenced by deployments. 【F:.env.sample†L1-L24】【F:k8s/README-production.md†L1-L57】
- [ ] **Task 2.2: Validate secret sourcing**
  - Confirm secrets are injected via env vars and not hard-coded in manifests.
  - Evidence: `kubectl describe deploy workpro-backend -n workpro-prod` shows env from secret. 【F:k8s/README-production.md†L1-L57】

### Gap 3: Validate operational readiness

- [ ] **Task 3.1: Confirm health probes**
  - Validate `/api/health/live` and `/api/health/ready` return expected responses.
  - Evidence: probes green in `kubectl get pods -n workpro-prod`. 【F:docs/production-readiness.md†L33-L41】
- [ ] **Task 3.2: Confirm metrics scraping**
  - Ensure Prometheus scrape config targets `/metrics`.
  - Evidence: metrics visible in Prometheus targets. 【F:k8s/README-production.md†L86-L98】
- [ ] **Task 3.3: Validate security hardening**
  - Verify lockouts, password policies, and token TTLs match policy via env configuration.
  - Evidence: production env values set for `LOGIN_LOCKOUT_*` and token TTLs. 【F:docs/production-readiness.md†L14-L29】【F:.env.sample†L33-L74】
- [ ] **Task 3.4: Validate backup strategy**
  - Confirm MongoDB backup/PITR strategy is implemented.
  - Evidence: backup job or managed snapshot policy exists. 【F:docs/production-readiness.md†L20-L31】【F:k8s/README-production.md†L99-L141】

### Gap 4: Confirm frontend runtime configuration

- [ ] **Task 4.1: Update production frontend config map**
  - Set `VITE_API_URL`, `VITE_WS_URL`, and `VITE_HTTP_ORIGIN` to production values.
  - Evidence: `kubectl describe configmap workpro-frontend-config -n workpro-prod` shows real URLs. 【F:k8s/overlays/prod/patch-configmap.yaml†L1-L8】

## Overall Assessment

The repository includes strong documentation, configuration scaffolding, and deployment artifacts for production. However, it is **not production-ready without environment-specific configuration updates** (secrets, hostnames, image digests, runtime URLs) and **validation of operational requirements** (monitoring, backups, and security hardening). 【F:docs/production-readiness.md†L1-L52】【F:k8s/README-production.md†L1-L143】【F:k8s/overlays/prod/patch-ingress.yaml†L1-L11】【F:k8s/overlays/prod/kustomization.yaml†L1-L13】
