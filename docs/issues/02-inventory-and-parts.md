# Inventory and Parts

## Summary
Stand up inventory foundations with Parts, Stock Locations, and Part Stock to support work order consumption, cost rollups, and proactive reordering.

## User Stories
- As a storeroom clerk, I can add and adjust parts with locations and reorder points.
- As a technician, I can reserve/consume parts on a Work Order and see remaining on-hand quantities.
- As a maintenance manager, I can view reorder alerts and approve restocking actions.

## Acceptance Criteria
- **Models:** Add `Part`, `StockLocation`, and `PartStock` with tenant scoping, cost, unit of measure, reorder point/qty, preferred vendor, barcode/SKU, and attachments/spec sheets.
- **CRUD APIs:** Endpoints for creating/updating/listing/deleting parts, locations, and stock records with pagination, tag filters, and soft-delete; include validation and permission checks.
- **Work Order integration:** API and UI to reserve and consume parts on a WO, decrementing `PartStock` and calculating WO parts cost rollup; prevent over-issuance when insufficient stock.
- **Reorder alerts:** Scheduled job scans stock vs reorder point, creates alert queue entries, and exposes UI table with approve/skip actions; optional email notification.
- **Costing:** Track average and last cost; WO parts cost appears in WO totals and export.
- **UI:** Inventory list with search/filter, part detail with location balances and movement history; modal to issue/return parts to WOs.
- **Seed data:** Include sample parts, a stock location hierarchy (building/room/bin), and WO with consumed parts.
- **Docs:** Add API schema notes and “How to test” for issuing/reserving parts and reorder alerts.

## Non-Goals
- Serialized assets or lot/expiry tracking (future enhancement).

## Dependencies
- Work Orders for consumption links; Vendor/PO integration covered in separate epic.

## Testing/Validation
- Unit tests for validators and cost calculations; integration tests for reserve/consume flow and reorder job behavior.
- UI tests for issuing parts and viewing alerts queue.
- End-to-end scenario: reserve part on WO → complete WO → stock decremented and costs visible.
