# Release Checklist

- [ ] Production env vars provided.
- [ ] Secrets provisioned externally (not in git).
- [ ] TLS certs configured for ingress/public endpoints.
- [ ] `indexes:ensure` run successfully.
- [ ] Backup schedule configured and restore tested.
- [ ] CI workflow green on target commit.
- [ ] Health/readiness checks passing post-deploy.
