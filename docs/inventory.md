# Inventory module reference

This document summarizes the data model, API endpoints, permissions, costing behavior, and manual test flow for WorkPro inventory. It is intended as a quick design and QA reference rather than a full API specification.

## Data model (schemas)

### Item
- **_id**: ObjectId
- **tenantId**: ObjectId (tenant scoping)
- **sku**: string (unique per tenant)
- **name**: string
- **description**: string
- **categoryId**: ObjectId
- **uom**: string (unit of measure)
- **reorderPoint**: number (minimum on-hand threshold)
- **reorderQty**: number (default quantity when reordering)
- **isActive**: boolean
- **costing**:
  - **averageCost**: number
  - **lastCost**: number
- **audit**: createdBy, updatedBy, timestamps

### StockLevel (by location/bin)
- **_id**: ObjectId
- **itemId**: ObjectId
- **locationId**: ObjectId
- **bin**: string (optional)
- **onHand**: number
- **reserved**: number (allocated to work orders)
- **available**: derived `onHand - reserved`

### WorkOrderPart
- **_id**: ObjectId
- **workOrderId**: ObjectId
- **itemId**: ObjectId
- **qtyReserved**: number
- **qtyIssued**: number
- **status**: `reserved | issued | returned`
- **costSnapshot**: cost captured when issued (average or last depending on configuration)

### ReorderAlert
- **_id**: ObjectId
- **itemId**: ObjectId
- **locationId**: ObjectId
- **triggeredAt**: datetime
- **currentQty**: number
- **threshold**: number (reorderPoint)
- **status**: `open | acknowledged | ordered | dismissed`
- **notes**: string

## API endpoints

All endpoints are scoped by tenant and require authentication.

### Items (CRUD)
- `GET /api/inventory/items` – list with filters (sku, category, active, location availability).
- `POST /api/inventory/items` – create a new item (sku, name, costing config, reorder settings).
- `GET /api/inventory/items/:id` – fetch single item with aggregate stock levels.
- `PUT /api/inventory/items/:id` – update item details, costing mode, reorder thresholds.
- `DELETE /api/inventory/items/:id` – soft-delete/deactivate item.

### Stock adjustments and receipts
- `POST /api/inventory/items/:id/receive` – increment onHand at a location/bin with unit cost; updates average and last cost.
- `POST /api/inventory/items/:id/adjust` – manual correction for onHand/reserved deltas with reason codes.

### Work order parts
- `POST /api/work-orders/:workOrderId/parts` – reserve quantity for a work order; reduces available stock and increases reserved.
- `PATCH /api/work-orders/:workOrderId/parts/:partId/issue` – issue previously reserved qty; records cost snapshot; decreases onHand and reserved.
- `PATCH /api/work-orders/:workOrderId/parts/:partId/return` – return unused qty to stock; recalculates average cost only if configured to include returns.
- `DELETE /api/work-orders/:workOrderId/parts/:partId` – unreserve part; frees reserved qty.

### Reorder alerts
- `GET /api/inventory/alerts` – list alerts with filters by status/location/item.
- `POST /api/inventory/items/:id/alerts/ack` – acknowledge alert and add notes.
- `POST /api/inventory/items/:id/alerts/order` – mark alert as ordered with PO reference.
- `POST /api/inventory/items/:id/alerts/dismiss` – close alert without ordering.
- Alert generation is automatic after receives/adjustments/issue events when `available < reorderPoint` and no open alert exists.

## Permissions matrix

| Action | Admin | Inventory Manager | Technician |
| --- | --- | --- | --- |
| Create/Update item | ✅ | ✅ | ❌ |
| Delete/deactivate item | ✅ | ✅ (soft-delete only) | ❌ |
| Receive stock | ✅ | ✅ | ✅ (if assigned location) |
| Manual stock adjustment | ✅ | ✅ | ❌ |
| Reserve/issue/return on work order | ✅ | ✅ | ✅ |
| Configure reorder thresholds | ✅ | ✅ | ❌ |
| Acknowledge or dismiss alerts | ✅ | ✅ | ❌ |

> Roles map to tenant RBAC: Admin = Tenant Owner/Super Admin, Inventory Manager = Maintenance Manager, Technician = Standard Technician. More granular scopes can be added per location.

## Costing notes

- **Average cost** is updated on each receipt as `(prevAvgCost * onHand + receiptCost * receiptQty) / (onHand + receiptQty)` before reservation changes; returns can optionally reintroduce the cost at the current average.
- **Last cost** simply stores the unit cost on the most recent receipt; it does not change on issues or returns.
- Issuing parts to work orders records a **cost snapshot** using the active costing policy (average or last) so downstream financials remain immutable even if costs later change.

## How to test (manual walkthrough)

1. **Receive stock**
   - Create an item with reorderPoint 10 and reorderQty 25.
   - `POST /api/inventory/items/:id/receive` with qty 20 and unitCost 5.00 at location A.
   - Verify stock level shows onHand 20, reserved 0, available 20; averageCost = lastCost = 5.00.
2. **Reserve and issue on a work order**
   - Create a work order and call `POST /api/work-orders/:woId/parts` with qty 5; available drops to 15, reserved rises to 5.
   - Issue via `PATCH /api/work-orders/:woId/parts/:partId/issue` with qty 5; onHand becomes 15, reserved returns to 0; part records cost snapshot 5.00.
3. **Trigger reorder alert**
   - Receive another item with reorderPoint 8 and current onHand 6; confirm an open alert is created automatically.
   - Call `POST /api/inventory/items/:id/alerts/ack` to acknowledge and add a note; status becomes `acknowledged`.
   - Optionally call `.../order` with a PO reference to mark ordered, or `.../dismiss` to close without ordering; ensure subsequent receipts above threshold auto-close the alert.
