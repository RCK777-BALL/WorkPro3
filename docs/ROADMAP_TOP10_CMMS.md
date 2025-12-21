# Roadmap vs Top CMMS Expectations

This roadmap aligns WorkPro with core expectations found in mature CMMS platforms (MaintainX, Limble, UpKeep, Fiix, eMaint). Each epic below maps to common buyer checklists across work intake, inventory, purchasing, PM maturity, analytics, enterprise controls, notifications, and integrations.

| Epic | Top CMMS Expectation Coverage | Demo/Seed Notes |
| --- | --- | --- |
| Work Request Portal | Public request intake, triage queue, conversion to Work Order, audit trail, requester comms | Seed open + converted requests with attachments and triage history |
| Inventory and Parts | Parts master data, stock locations, issue/return to WOs, cost rollups, reorder alerts | Seed parts with multi-bin locations and a WO consuming parts |
| Vendors and PO Lite | Vendor master, PO lifecycle, receiving into stock, spend visibility, audit of status changes | Seed vendors and POs (draft/sent/partial receipt) showing stock adjustments |
| PM Maturity | Procedure templates with versioning, PM/WP linkage, checklist execution with evidence, IoT-triggered WOs | Seed two template versions, PM schedule, generated WO with completed checklist and IoT trigger example |
| Analytics and Downtime | Downtime logging, MTTR/MTBF, backlog and PM compliance dashboards, exports | Seed downtime events and analytics fixtures for charts/exports |
| Enterprise RBAC and Audit | Role/permission matrix per module, enforced middleware, append-only audit log with UI | Seed tenant roles (Admin/Dispatcher/Technician/Viewer) plus audit entries |
| Notifications and SLA Escalations | In-app/email notifications, SLA timers, escalation workflows, websocket delivery | Seed SLA rules and notification inbox with escalated item |
| Integrations, Webhooks, and Exports | API keys with scopes/rate limits, signed webhooks with retries, bulk CSV/XLSX exports | Seed API key, webhook subscription, and completed export job |

## Sequencing Notes
1. **Foundations:** Work Request Portal and Enterprise RBAC/Audit to ensure safe intake and governance.
2. **Execution:** Inventory/Parts + Vendors/PO Lite to cover materials; PM Maturity to lift planned maintenance quality.
3. **Observability:** Analytics/Downtime and Notifications to surface performance + SLA adherence.
4. **Extensibility:** Integrations/Webhooks/Exports to connect with external systems and reporting.

## Success Metrics
- Time-to-triage < 10 minutes for new requests (with notifications enabled).
- On-hand accuracy tracked via reorder alerts with <5% stockouts in demos.
- PM compliance ≥ 90% in sample dashboards; MTTR/MTBF visible per asset class.
- 100% of critical writes recorded in audit log with enforced permissions.
- Webhook retry success rate > 95% in demo scenarios; exports delivered within 60 seconds for filtered sets.
