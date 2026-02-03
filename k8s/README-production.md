# Production deployment notes

This directory ships base Kubernetes manifests plus kustomize overlays for dev/prod. The base manifests are intentionally generic (example host names and image tags). Use overlays or your deployment pipeline to set real values.

## Secrets (required)

Create secrets **outside** of Git. A template lives at `k8s/secrets.example.yaml`. For local overrides, create `k8s/secrets.yaml` (gitignored).

Recommended approach (manual):

```bash
kubectl create secret generic workpro-app-secrets \
  --from-literal=JWT_SECRET='<32+ char secret>' \
  --from-literal=JWT_ACCESS_SECRET='<optional separate access secret>' \
  --from-literal=JWT_REFRESH_SECRET='<optional separate refresh secret>' \
  --from-literal=MONGO_URI='mongodb://workpro_app:<app-pass>@mongo:27017/WorkPro3?authSource=WorkPro3&tls=true&tlsCAFile=/etc/mongo/tls/ca.crt' \
  --from-literal=CORS_ORIGIN='https://app.example.com,https://admin.example.com' \
  --from-literal=FRONTEND_URL='https://app.example.com'

kubectl create secret generic workpro-mongo-secrets \
  --from-literal=MONGO_INITDB_ROOT_USERNAME='workpro_root' \
  --from-literal=MONGO_INITDB_ROOT_PASSWORD='<root-pass>' \
  --from-literal=MONGO_APP_USER='workpro_app' \
  --from-literal=MONGO_APP_PASS='<app-pass>' \
  --from-literal=MONGO_DB='workpro' \
  --from-literal=MONGO_AUTH_DB='workpro'

kubectl create secret generic workpro-backup-secrets \
  --from-literal=AWS_ACCESS_KEY_ID='<access-key>' \
  --from-literal=AWS_SECRET_ACCESS_KEY='<secret-key>' \
  --from-literal=AWS_DEFAULT_REGION='us-east-1' \
  --from-literal=BACKUP_BUCKET='workpro-backups'
```

Optional backend/third-party secrets can be created from the template:

```bash
kubectl apply -f k8s/secrets.example.yaml
```

> **Note:** The example manifest includes placeholders. Do **not** apply it to production without replacing values.

Frontend runtime configuration (VITE_API_URL, VITE_WS_URL, VITE_SOCKET_PATH) is provided via `ConfigMap` (`workpro-frontend-config`) rather than secrets.

## Domains + TLS

The base ingress uses placeholder hosts. Use overlays or patches to set real hosts and TLS secrets:

```bash
kubectl apply -k k8s/overlays/dev
kubectl apply -k k8s/overlays/prod
```

Update `k8s/overlays/prod/patch-ingress.yaml` with your production hostname and TLS secret before applying.

Each overlay now defines a namespace (`workpro-dev` / `workpro-prod`). Make sure your secrets and configmaps live in the same namespace.

TLS options:

- **Recommended:** [cert-manager](https://cert-manager.io/) with Let’s Encrypt (set `cert-manager.io/cluster-issuer`).
- **Bring your own:** create a Kubernetes TLS secret and update the ingress `secretName` in your overlay.

Example manual TLS secret:

```bash
kubectl create secret tls workpro-prod-tls \
  --cert=/path/to/tls.crt \
  --key=/path/to/tls.key
```

## Images and tags

Base manifests use placeholder tags (`0.0.0`). Production overlays should pin immutable digests so the cluster never pulls mutable tags.

Example production update flow:

1. Build + push images (CI/CD):
   - `workpro-backend` → registry
   - `workpro-frontend` → registry
2. Capture digests:
   - `docker buildx imagetools inspect <image>:<tag>` or registry UI.
3. Update `k8s/overlays/prod/kustomization.yaml`:

```yaml
images:
  - name: workpro-backend
    digest: sha256:<backend-digest>
  - name: workpro-frontend
    digest: sha256:<frontend-digest>
```

> **Note:** Production manifests must never reference `:latest`.

## Metrics (/metrics)

The backend exposes Prometheus-compatible metrics at `/metrics` on port `5010`. Ensure your Prometheus scrape configuration uses this endpoint. The frontend does **not** expose metrics.

The API liveness/readiness endpoints live at:

- `/api/health/live`
- `/api/health/ready` (returns 503 until Mongo is connected)

Kubernetes probes in `k8s/deployment.yaml` use these paths.

## MongoDB strategy (HA + backups)

### Option A — Managed MongoDB (recommended)

Use a managed service like MongoDB Atlas with TLS required. Configure `MONGO_URI` to the managed endpoint with TLS enforced and allow-list your cluster egress. Enable scheduled snapshots + PITR as your backup strategy.

### Option B — Self-hosted replica set

A reference StatefulSet is provided under `k8s/mongo-replicaset.example/`. It is **not** applied by default and requires:

- Replica set initialization (`rs.initiate`)
- A PVC per replica
- Anti-affinity and PodDisruptionBudget
- TLS certificates and `--tlsMode requireTLS`
- A keyfile secret for internal replication auth (`mongo-keyfile`)
- Secrets for root/app users and TLS/keyfile materials (see `k8s/mongo-replicaset.example/secrets.example.yaml`)

### Backups

- **Managed:** use Atlas scheduled snapshots + PITR.
- **Self-hosted:** schedule `mongodump` via CronJob. Example manifest: `k8s/jobs/mongo-backup-cronjob.example.yaml` (requires `workpro-backup-secrets` for S3-compatible storage).

## Availability protections

- PodDisruptionBudgets are defined in `k8s/pdb.yaml` to keep at least one backend and frontend pod available during node drains.
- HorizontalPodAutoscalers are defined in `k8s/hpa.yaml` (CPU + memory).

## External Secrets (optional)

If you use External Secrets Operator, see `k8s/external-secrets/example.yaml` for a starter manifest.
