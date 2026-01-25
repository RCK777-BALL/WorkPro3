# Production deployment notes

This directory ships base Kubernetes manifests plus kustomize overlays for dev/prod. The base manifests are intentionally generic (example host names and image tags). Use overlays or your deployment pipeline to set real values.

## Secrets (required)

Create secrets **outside** of Git. A template lives at `k8s/secrets.example.yaml`. For local overrides, create `k8s/secrets.yaml` (gitignored).

Recommended approach (manual):

```bash
kubectl create secret generic workpro-app-secrets \
  --from-literal=JWT_SECRET='<32+ char secret>' \
  --from-literal=MONGO_URI='mongodb://workpro_app:<app-pass>@mongo:27017/WorkPro3?authSource=WorkPro3&tls=true&tlsCAFile=/etc/mongo/tls/ca.crt'

kubectl create secret generic workpro-mongo-secrets \
  --from-literal=MONGO_INITDB_ROOT_USERNAME='workpro_root' \
  --from-literal=MONGO_INITDB_ROOT_PASSWORD='<root-pass>' \
  --from-literal=MONGO_APP_USER='workpro_app' \
  --from-literal=MONGO_APP_PASS='<app-pass>' \
  --from-literal=MONGO_DB='workpro' \
  --from-literal=MONGO_AUTH_DB='workpro'
```

Optional backend/third-party secrets can be created from the template:

```bash
kubectl apply -f k8s/secrets.example.yaml
```

> **Note:** The example manifest includes placeholders. Do **not** apply it to production without replacing values.

## Domains + TLS

The base ingress uses placeholder hosts. Use overlays or patches to set real hosts and TLS secrets:

```bash
kubectl apply -k k8s/overlays/dev
kubectl apply -k k8s/overlays/prod
```

TLS options:

- **Recommended:** [cert-manager](https://cert-manager.io/) with Let’s Encrypt (set `cert-manager.io/cluster-issuer`).
- **Bring your own:** create a Kubernetes TLS secret and update the ingress `secretName` in your overlay.

## Images and tags

Base manifests use `workpro-backend:1.0.0` and `workpro-frontend:1.0.0`. Overlays can override tags via kustomize `images`.

## Metrics (/metrics)

The backend exposes Prometheus-compatible metrics at `/metrics` on port `5010`. Ensure your Prometheus scrape configuration uses this endpoint. The frontend does **not** expose metrics.

## MongoDB strategy (HA + backups)

### Option A — Managed MongoDB (recommended)

Use a managed service like MongoDB Atlas with TLS required. Configure `MONGO_URI` to the managed endpoint with TLS enforced and allow-list your cluster egress. Enable scheduled snapshots + PITR as your backup strategy.

### Option B — Self-hosted replica set

A reference StatefulSet is provided under `k8s/mongo-replicaset.example/`. It is **not** applied by default and requires:

- Replica set initialization (`rs.initiate`)
- A PVC per replica
- Anti-affinity and PodDisruptionBudget
- TLS certificates and `--tlsMode requireTLS`

### Backups

- **Managed:** use Atlas scheduled snapshots + PITR.
- **Self-hosted:** schedule `mongodump` via CronJob. Example manifest: `k8s/jobs/mongo-backup-cronjob.example.yaml`.

## External Secrets (optional)

If you use External Secrets Operator, see `k8s/external-secrets/example.yaml` for a starter manifest.
