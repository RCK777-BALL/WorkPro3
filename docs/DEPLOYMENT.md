# Deployment Guide

## Environments
- **Development:** local `.env` files.
- **Staging/Production:** Kubernetes secrets + config maps.

## Steps (Kubernetes)
1. Build and push images using `.github/workflows/release.yml`.
2. Apply secrets (`k8s/secrets.example.yaml` → environment-specific file).
3. Apply deployments, services, and ingress manifests.
4. Verify `/health/live` and `/health/ready` endpoints.

## Rollback
- Revert to the previous image tag in the deployment manifest.
- Re-apply manifests and validate readiness endpoints.
