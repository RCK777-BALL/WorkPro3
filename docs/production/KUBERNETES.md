# Kubernetes Production Baseline

## Manifests
- Base: `k8s/`
- Prod overlay: `k8s/overlays/prod`

## Probes
- backend liveness: `/health`
- backend readiness: `/ready`
- backend startup probe enabled

## Capacity
- Added resource requests/limits in deployment manifests.

## Secrets guidance
- Store only references in manifests.
- Use SealedSecrets / ExternalSecrets / cloud secret manager integration.
- Rotate JWT/DB credentials and enforce least privilege.
