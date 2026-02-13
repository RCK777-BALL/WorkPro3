# Secret Management

## Principles
- Never commit secrets to the repository.
- Use environment-specific secret stores (Kubernetes, CI, or cloud vaults).
- Rotate secrets regularly.

## Local Development
- Use `.env` files in backend and frontend.
- Never check `.env` files into git; use `.env.sample` as a template.

## Kubernetes
- Copy `k8s/secrets.example.yaml` to create environment-specific secrets.
- Replace placeholder values with real secrets.
- Apply using:
  ```bash
  kubectl apply -f k8s/secrets.prod.yaml
  ```

## CI/CD
- Store secrets in the CI provider’s encrypted secret store.
- Use environment variables during build/deploy steps.
