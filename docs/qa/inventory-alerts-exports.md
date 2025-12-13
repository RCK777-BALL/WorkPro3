# Inventory alerts, exports, and role coverage QA checklist

_Last updated: 2025-12-13_

## Environment readiness
- Tenant/auth service and seeded inventory data are **not running in this container**, so flows below are recorded as blocked pending an environment with working API base URLs, JWT secrets, and role assignments.
- Low-stock widgets rely on `/api/summary/low-stock` and `/api/inventory/low-stock`; confirm those endpoints are reachable before re-running.
- CSV/PDF exports require a renderer (Playwright/Chromium). Those binaries were not available during this pass, so export verification is pending an environment with the dependencies installed.

## Test accounts
| Email | Role | Status | Notes |
| --- | --- | --- | --- |
| admin-inventory@example.com | Admin | 🚧 Pending | Needs provisioning with full tenant + inventory permissions (can acknowledge/clear alerts and export all items). |
| manager-inventory@example.com | Manager | 🚧 Pending | Requires scoped inventory manage/read permissions; should acknowledge alerts but not clear for other sites. |
| picker-inventory@example.com | Picker | 🚧 Pending | Inventory read-only; should not see transaction history beyond assigned site and cannot acknowledge/clear alerts. |

## Inventory filters and transaction history
| Test case | Admin | Manager | Picker | Notes/expected behavior |
| --- | --- | --- | --- | --- |
| Inventory list honors search, category/location filters, and date ranges | ⏳ Blocked | ⏳ Blocked | ⏳ Blocked | UI/API unavailable; re-run once seeded inventory exists. |
| Saved filters only visible to creator (unless admin override) | ⏳ Blocked | ⏳ Blocked | ⏳ Blocked | Verify ownership enforcement once auth is online. |
| Transaction history shows full audit (create/update/consume/transfer) | ⏳ Blocked | ⏳ Blocked | ⏳ Blocked | Admin/manager read-only; picker should see own site only. |
| Hidden fields respect role (cost/vendor visible only to admin/manager) | ⏳ Blocked | ⏳ Blocked | ⏳ Blocked | Confirm field-level permission flags from backend responses. |

## Low-stock alerts, dashboard widget, and notifications
| Test case | Admin | Manager | Picker | Notes/expected behavior |
| --- | --- | --- | --- | --- |
| Trigger low-stock via seed (quantity ≤ reorderThreshold) | ⏳ Blocked | ⏳ Blocked | ⏳ Blocked | Needs fixture data or threshold edits through `/api/inventory`. |
| Dashboard widget shows low-stock count per site | ⏳ Blocked | ⏳ Blocked | ⏳ Blocked | Admin sees all sites; manager/picker only assigned site(s). |
| Email/in-app notification emitted when threshold breached | ⏳ Blocked | ⏳ Blocked | ⏳ Blocked | Await notification service availability. |
| Acknowledge alert | ⏳ Blocked | ⏳ Blocked | 🚫 Not permitted | Picker should lack acknowledge/clear actions. |
| Clear/dismiss alert | ⏳ Blocked | ⏳ Blocked | 🚫 Not permitted | Only admin/manager can clear within scope. |

## CSV/PDF exports
| Test case | Admin | Manager | Picker | Notes/expected behavior |
| --- | --- | --- | --- | --- |
| Export respects active filters (search, date, location/site) | ⏳ Blocked | ⏳ Blocked | ⏳ Blocked | Needs CSV/PDF generation enabled with Playwright/Chromium binaries. |
| Export scopes to permitted sites/tenants | ⏳ Blocked | ⏳ Blocked | 🚫 Not permitted | Picker should be blocked from exports; verify HTTP 403. |
| Export file formatting (headers, date/number formats) | ⏳ Blocked | ⏳ Blocked | ⏳ Blocked | Open downloaded CSV/PDF to confirm column order, timezone handling, and locale formatting. |
| Transaction history export visibility per role | ⏳ Blocked | ⏳ Blocked | 🚫 Not permitted | Picker should not see history export option. |

## Next steps
1. Stand up backend + frontend with tenant-scoped auth and seed inventory with varying `reorderThreshold` values.
2. Provision the three test accounts above and map sites/tenants so manager/picker scoping can be validated.
3. Re-run the checklist, capture screenshots of low-stock widget/notifications, and attach sample CSV/PDF files for formatting review.
