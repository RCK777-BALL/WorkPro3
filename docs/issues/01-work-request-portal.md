# Work Request Portal

## Summary
Create a tenant-ready work request intake and triage experience with convert-to-work-order support. The module must be demoable with seed data and surfaced in both API and UI.

## User Stories
- As a requester, I can submit a work request without needing a login so technicians can receive issues quickly.
- As a dispatcher, I can review, filter, and accept or reject incoming requests with the right metadata.
- As a maintenance manager, I can convert an approved request into a Work Order with minimal data re-entry.

## Acceptance Criteria
- **Data model:** Add a `WorkRequest` collection with tenant scoping, requester contact info, asset/location references, priority, category, attachments, tags, status, and decision metadata (accepted/rejected/converted) with timestamps and actor IDs.
- **Validation:** Server-side validation for required fields, max lengths, and attachment type/size; reject unauthenticated conversions; only admins/dispatchers can triage.
- **API:** CRUD endpoints (`create`, `list with filters/search`, `get by id`, `update status`, `soft delete`), plus `POST /work-requests/:id/convert` to create a Work Order that links back to the original request and copies notes/files.
- **UI:** Add a “Work Request Portal” page with a public submission form, list view with filters (status, priority, asset/location, tag), and a triage detail drawer showing timeline/audit.
- **Convert to Work Order:** UI action in detail drawer triggers server conversion, preserves request-to-WO linkage, and shows the resulting WO ID; prevent duplicate conversions.
- **Notifications:** Optional email or in-app notification to dispatchers on new request; in-app alert on conversion success/failure.
- **Audit/Tracking:** Track lifecycle events (submitted, accepted, rejected, converted) with actor/time in audit log; expose status counts in dashboard tiles.
- **Seed data:** Seed at least two requests (open + converted) tied to existing tenants/assets for demo.
- **Docs:** Document API schema, permissions, and “How to test” steps in `docs/`.

## Non-Goals
- Full customer portal branding/theming.
- SLA escalation rules (covered by Notifications epic).

## Dependencies
- Existing authentication/tenant middleware for access control.
- Work Order model for conversion target; asset/location references.

## Testing/Validation
- Unit and integration tests for validators, CRUD, and convert endpoint (happy path, permissions, duplicate conversion guard).
- UI component tests for form validation and conversion flow.
- E2E happy path: submit request → dispatcher converts → WO visible with linkage.
