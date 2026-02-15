# Purchasing flow

This document describes the lightweight purchasing APIs, their schemas, and how to exercise the end-to-end flow in tests.

## Domain models

- **Purchase order** (`backend/src/modules/purchase-orders/model.ts`)
  - `tenantId`, `vendorId` – required object IDs scoped per tenant.
  - `status` – one of `draft`, `pending`, `approved`, or `received` (default `draft`).
  - `items` – array of line items each with `partId`, `quantity`, optional `unitCost`, `received` (defaults to `0`), and `status` (`open` | `partial` | `received`).
  - `totalCost` – virtual field summing `quantity * unitCost` across line items.
- **Inventory part** (`backend/src/modules/inventory/models/Part.ts`) – referenced by `partId`; `quantity` is incremented when receipts are applied.

## Validation schemas

Zod schemas live in `backend/src/modules/purchase-orders/validation.ts`:

- `purchaseOrderInputSchema` – `{ vendorId: string, items: [{ partId: string, quantity: number > 0, unitCost?: number >= 0 }], status?: draft|pending|approved|received }`.
- `statusInputSchema` – `{ status: draft|pending|approved|received }`.
- `receivePurchaseOrderSchema` – `{ receipts: [{ partId: string, quantity: number > 0 }] }`.

Invalid enum values, missing IDs, empty item arrays, or non-positive quantities will be rejected with a 400 response.

## Endpoints

All routes are under `/purchase-orders` (`backend/src/modules/purchase-orders/router.ts`) and expect `req.tenantId` to be populated (middleware sets this in production). Cross-tenant access is blocked by scoping queries to `tenantId`.

- `GET /purchase-orders` – list the 100 most recent purchase orders.
- `POST /purchase-orders` – create a purchase order. Accepts `purchaseOrderInputSchema`. Responds with the serialized order (201).
- `PUT /purchase-orders/:purchaseOrderId` – update a draft/pending order. Requires the same payload as creation.
- `POST /purchase-orders/:purchaseOrderId/status` – transition status using `statusInputSchema`.
- `POST /purchase-orders/:purchaseOrderId/receive` – apply receipts using `receivePurchaseOrderSchema`.

## Status transitions

Allowed transitions are enforced in `service.ts`:

- `draft → pending → approved → received` (one-way).
- Edits are only permitted while the order is `draft` or `pending`.
- Receiving is only allowed for `approved` or `received` orders; invalid moves return a 400.

## Receiving contract

- Receipts with non-positive quantities are ignored and will raise a validation error if all lines are invalid.
- Each receipt line must reference a `partId` on the purchase order; otherwise a `400 Receipt item not found on purchase order` error is returned.
- Over-receipts are guarded: received quantity is capped at the ordered `quantity`, and item status progresses from `open` → `partial` → `received` accordingly.
- When all lines are fully received the purchase order status automatically becomes `received`.
- Part quantities are incremented as receipts are processed; `unitCost` values roll into the `totalCost` virtual field for reporting.

## Permissions and tenancy

- Every lookup filters by `tenantId`, so attempts to transition or receive a purchase order belonging to a different tenant will return `404 Purchase order not found`.
- Routes assume authentication middleware has populated `req.tenantId` and that callers have permission to manage purchasing within their tenant.

## How to test

Unit and integration coverage lives in `backend/tests`:

1. Install dependencies: `npm ci --prefix backend`.
2. Run the backend suite (uses `mongodb-memory-server`): `npm test --prefix backend -- --runInBand`.
3. Frontend purchasing UI tests (Vitest + Testing Library): `npm test --prefix frontend -- --runInBand`.

Integration tests create purchase orders, transition them through pending/approved, receive items, and assert stock and tenant guards. Frontend tests exercise draft creation, receive validation, and status timeline updates for the purchasing pages.
