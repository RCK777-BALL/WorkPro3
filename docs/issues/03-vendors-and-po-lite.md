# Vendors and PO Lite

## Summary
Introduce vendor management and a lightweight purchasing flow that can receive parts into inventory with auditability.

## User Stories
- As a buyer, I can maintain a list of approved vendors with contact details.
- As a storeroom clerk, I can receive ordered quantities and automatically update stock.
- As a finance reviewer, I can see receiving history and costs tied to parts.

## Acceptance Criteria
- **Models:** Add `Vendor` and `PurchaseOrder` with line items referencing parts, quantities, costs, taxes/fees, and tenant scoping.
- **CRUD APIs:** Endpoints for vendor management and PO lifecycle (draft, sent, partially received, closed/canceled) with validation and role checks.
- **Receiving flow:** `POST /purchase-orders/:id/receive` updates `PartStock` balances and records who received, quantity, and date; prevent over-receipt and log backorders.
- **Audit:** Append-only audit entries for PO status changes and receipts; expose in API and UI detail view.
- **UI:** Vendor list/detail pages and a PO Lite workflow (create PO, add lines, mark sent, receive, close) with status badges and activity timeline.
- **Cost integration:** Update part last/average cost on receipt; expose spend rollups by vendor.
- **Seed data:** Sample vendors, POs in draft/sent states, and at least one partially received PO demonstrating stock update.
- **Docs:** API schema, permission matrix, and “How to test” instructions covering receive → inventory update.

## Non-Goals
- Three-way matching or invoice payments.
- Multi-currency support.

## Dependencies
- Parts/Inventory epic for part references and stock updates.

## Testing/Validation
- Unit tests for PO validators and status transitions; integration tests for receiving flow updating stock and costs.
- UI tests for PO creation and receiving interactions.
- End-to-end: create PO → mark sent → receive partial → verify stock increments and audit trail.
