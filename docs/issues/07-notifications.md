# Notifications and SLA Escalations

## Summary
Add in-app and email notifications with SLA-based rules and escalation workflows, including WebSocket delivery.

## User Stories
- As a technician, I receive real-time notifications when I am assigned or when requests convert to WOs.
- As a supervisor, I configure SLA rules and escalations for overdue items.
- As an end user, I can see a notifications inbox and mark items as read.

## Acceptance Criteria
- **Model:** Notification entity with tenant scope, category, message, CTA link, read/unread state, recipient(s), and delivery channels (in-app, email) behind feature flag for email.
- **Delivery:** WebSocket push for in-app notifications; email delivery using existing mailer with tenant branding; retries and dead-letter handling for failures.
- **SLA rules:** Configurable rules per module (work requests, WOs, POs) with thresholds and escalation paths (notify supervisor, reassign, bump priority); UI to manage rules.
- **Inbox UI:** Notifications dropdown + dedicated page with filters (unread, category, SLA), bulk mark-as-read, and pagination.
- **Hooks:** Emit notifications on key events (new work request, conversion to WO, part reorder alert creation, PO received, PM generated, downtime logged).
- **Seed data:** Sample notifications and SLA rules for demo tenants; include one escalated item.
- **Docs:** API schema, feature flag behavior, and “How to test” covering websocket + email toggle and SLA escalation.

## Non-Goals
- SMS/push mobile notifications in this phase.

## Dependencies
- WebSocket setup already used by the app; email service configured in env.

## Testing/Validation
- Unit tests for rule evaluation and notification creation; integration tests for websocket delivery and email fallback under flag.
- UI tests for inbox interactions and SLA rule editor.
- E2E: create work request → SLA rule triggers escalation → supervisor receives notification; verify read-state sync across devices.
