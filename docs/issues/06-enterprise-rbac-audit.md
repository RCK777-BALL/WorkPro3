# Enterprise RBAC and Audit Log

## Summary
Implement granular role-based access control with permission matrix enforcement and an append-only audit log surfaced in UI.

## User Stories
- As a security admin, I can configure which roles can perform specific actions across modules.
- As an auditor, I can review immutable change history for critical write operations.
- As a manager, I can quickly see who changed what and when inside the app.

## Acceptance Criteria
- **RBAC model:** Define permissions per module/action (e.g., work requests, work orders, parts, POs, PM templates, analytics) and assign to roles per tenant; middleware enforces on all relevant endpoints.
- **Permission matrix:** Documented and exposed via API/UI reference; support feature flags for disabling modules per tenant.
- **Audit log:** Append-only log capturing user, tenant, timestamp, action, target type/ID, payload diff/snapshot, and request metadata; stored in a dedicated collection with retention config.
- **Coverage:** All critical write endpoints (create/update/delete/convert/receive/reserve) emit audit events; background jobs log meaningful events (e.g., reorder alert created).
- **UI:** Admin page to view/filter audit logs with export to CSV; RBAC admin screen to assign roles and preview effective permissions for a user.
- **Seed data:** Default roles/permissions aligned with CMMS norms (Admin, Dispatcher, Technician, Viewer) plus sample audit entries.
- **Docs:** Permission matrix table and “How to test” showing enforcement failures and audit visibility.

## Non-Goals
- SSO/SCIM provisioning (handled elsewhere).

## Dependencies
- Existing auth + tenant context; interacts with all feature epics.

## Testing/Validation
- Unit tests for permission checks and audit log serialization; integration tests ensuring forbidden actions return correct status codes and audits are written.
- UI tests for RBAC admin and audit log filter/export flows.
- E2E: attempt unauthorized action → receive denial → audit still records attempt (where appropriate).
