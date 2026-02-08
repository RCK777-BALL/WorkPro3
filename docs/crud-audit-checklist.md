# CRUD Audit Checklist (Live App)

Use this checklist to validate create/edit/delete flows across the live WorkPro app once the backend and frontend are running.
It assumes you have seeded data and an authenticated admin account.

## 1) Prerequisites

1. Configure backend and frontend environment variables (`.env` for the backend, `.env.local` for the frontend) so the API
   and web client can talk to each other.
2. Start the backend and frontend development servers.

## 2) Seed data required for full CRUD coverage

Seed in this order so that the admin account, tenant, and demo records exist:

1. **Admin + tenant**
   ```bash
   cd backend
   npm run seed:admin
   ```
   This creates the admin user `admin@example.com` with the default password `admin123` unless overridden by
   `ADMIN_DEFAULT_PASSWORD`.

2. **Sample records**
   ```bash
   npm run seed
   ```
   This seeds example work orders, PM templates, notifications, and additional demo records used by multiple
   modules (work orders, PM, IoT, etc.).

Optional: seed departments only (useful for verifying hierarchy CRUD without the rest of the sample data):

```bash
npx ts-node --files scripts/seedDepartments.ts
```

## 3) Login roles to validate

- **Admin** (`admin@example.com` / `admin123`) for full access.
- **Planner/Manager** for work requests, PM planning, and reporting views.
- **Technician** for work execution workflows.

## 4) CRUD audit checklist by module

### Work Orders
- Create a new work order with required fields.
- Edit priority/status/assignment.
- Attach checklists, signatures, and photos.
- Delete a draft work order (or archive if deletion is blocked).
- Verify activity history, status transitions, and any offline queue messaging.

### Work Requests
- Submit a new request form from the public portal.
- Edit and triage requests.
- Convert a request to a work order and verify traceability.
- Delete/cancel a request and confirm removal in lists.

### Assets & Asset Explorer
- Create a new asset.
- Edit asset metadata (status, criticality, location).
- Remove an asset and verify references (work orders, inventory links).

### Inventory & Purchasing
- Create parts, locations, and vendors.
- Edit reorder points, stock counts, and vendor associations.
- Delete a part or location and verify validation errors if referenced.
- Generate and edit a purchase order, then delete or cancel it.

### Departments / Lines / Stations
- Create department → line → station hierarchy entries.
- Add/edit/delete assets inside stations.
- Verify search, filter, and Excel import/export behaviors.

### PM Templates & Schedules
- Create a PM template and tasks.
- Edit template revisions.
- Delete a template and confirm any dependency warnings.
- Create a schedule and verify generated work orders.

### Users, Roles, and Permissions
- Create a user and assign a role.
- Edit role permissions and verify UI access changes.
- Delete or deactivate users and verify access is revoked.

### Notifications & Messaging
- Trigger notifications (new work order, status change) and verify content.
- Delete a notification and confirm it is removed from lists.

### Reports & Analytics
- Verify filters update charts/tables.
- Export CSV/PDF where available.
- Delete any saved views if supported.

## 5) UX & production readiness checks

- Confirm every form has inline validation and clear error messaging.
- Verify destructive actions use confirmation dialogs.
- Confirm empty states show guidance and primary actions.
- Test offline queue behavior (disconnect/reconnect) for work orders and assets.
- Validate response times and error handling with the API offline.

## 6) Evidence to capture during audit

- Screenshots or screen recordings of each CRUD flow.
- API request logs (backend console or network tab).
- Final audit summary noting any blockers or required fixes.
