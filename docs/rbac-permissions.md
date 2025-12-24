# RBAC permissions

This document describes the role-based access control (RBAC) permissions used by the backend and frontend.

## Permission format

Permissions use the `resource.action` convention and are evaluated case-insensitively.

Examples:

- `workorders.read`
- `inventory.manage`
- `reports.export`

## Permission catalog

The canonical permission list lives in `shared/types/permissions.ts` (`PERMISSIONS`).

Current permission groups:

- **sites**: `sites.read`, `sites.manage`
- **assets**: `assets.read`, `assets.write`, `assets.delete`
- **workOrders**: `workorders.read`, `workorders.write`, `workorders.approve`
- **workRequests**: `workRequests.read`, `workRequests.convert`
- **roles**: `roles.read`, `roles.manage`
- **hierarchy**: `hierarchy.read`, `hierarchy.write`, `hierarchy.delete`
- **inventory**: `inventory.read`, `inventory.manage`, `inventory.purchase`
- **pm**: `pm.read`, `pm.write`, `pm.delete`
- **importExport**: `importExport.import`, `importExport.export`
- **executive**: `executive.read`, `executive.manage`
- **reports**: `reports.read`, `reports.build`, `reports.export`
- **audit**: `audit.read`

## Enforcement

- Middleware: `backend/src/auth/permissions.ts` provides `requirePermission()` and `assertPermission()`.
- Routes and module routers invoke `requirePermission()` for read/write/admin actions.
- `writeAuditLog()` records immutable `AuditEvent` entries alongside full `AuditLog` entries.

## Seeding

Seed data is generated in `backend/seed.ts`:

- Permissions are upserted into `Permission`.
- Role assignments are populated into `Role` and `RolePermission`.
- Default feature flags (`rbac_admin`, `audit_log_export`) are created.

## Feature flags

`FeatureFlag` records are tenant-scoped feature toggles used by the admin UI.

API endpoints (admin-only):

- `GET /api/feature-flags`
- `POST /api/feature-flags`
- `PUT /api/feature-flags/:id`

## UI locations

- Role management: `frontend/src/pages/RoleManagement.tsx`
- Feature flag admin: `frontend/src/pages/FeatureFlags.tsx`
- Audit logs: `frontend/src/features/audit/AuditLogsPage.tsx`
