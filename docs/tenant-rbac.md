# Tenant-aware RBAC and audit trails

This codebase includes shared helpers to keep tenant/site scoping consistent across HTTP routes and socket namespaces.

## Access control utilities

Use `withPolicyGuard` from `backend/src/auth/accessControl.ts` to compose middleware that enforces tenant context, optional role requirements, permission checks, and site scoping in a single place.

```ts
import { requireAuth } from '../../middleware/authMiddleware';
import { withPolicyGuard } from '../../src/auth/accessControl';

router.use(requireAuth);
router.use(...withPolicyGuard({ permissions: 'audit.read', siteScoped: true }));
```

`authorizeSocketTenant` performs the same JWT-driven tenant lookup for Socket.IO namespaces and returns the resolved identity so sockets can be annotated consistently.

`scopeQueryToTenant` creates tenant-filtered query shapes for Mongo models. Pass `siteScoped: true` when you need to bind data to a site-level boundary as well.

## Audit log search and export

Audit log endpoints already scope all queries to the current tenant. They accept filters for entity type, action, date windows, actor search, and optional site scoping. CSV export is capped to 1,000 records for safety.

## SCIM and SSO stubs

`backend/routes/scimRoutes.ts` exposes SCIM 2.0-compatible scaffolding guarded by `middleware/scimAuth.ts`. Supply `X-Tenant-Id` and the configured bearer token to exercise the endpoints. The shared helpers above make it easier to add per-tenant SSO callbacks as they are built out.
