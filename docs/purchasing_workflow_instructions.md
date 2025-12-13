# Purchasing Workflow Implementation Guide

This document outlines step-by-step, self-contained instructions to implement the requested purchasing features.

## 1. Workflow engine
1. Model purchase requests with statuses (e.g., `draft`, `pending_approval`, `approved`, `po_created`, `closed`).
2. Add transition rules with guards for required data (requester, supplier, line items, totals).
3. Implement approval actions that record approver, timestamp, and decision notes.
4. Create PO creation transition that locks request details and generates a linked purchase order record.
5. Add SLA timers per status (e.g., approval SLA hours, PO creation SLA hours) using background jobs or cron to evaluate overdue items.
6. Record audit logs for every transition with user, previous/new status, timestamp, and metadata (notes, SLA state).
7. Expose endpoints/services for transition triggers with validation and permission checks.
8. Provide status history views and SLA breach flags on purchase requests.

## 2. Supplier profiles
1. Extend supplier model with lead time fields (min/max or average days), pricing tiers (quantity/price breaks), preferred flag, and contract attachment references.
2. Add CRUD forms/APIs to manage supplier details and upload contract files.
3. Validate pricing tiers for non-overlapping quantity ranges and positive prices.
4. Enforce preferred supplier uniqueness per category (if applicable) and require lead times for active suppliers.
5. Display supplier details in request and PO screens, including contract links.

## 3. Purchase order (PO) handling
1. Implement PO generation from approved requests, copying supplier and line details and assigning PO numbers.
2. Add export services for PO PDF and CSV formats; include headers, supplier info, line items, totals, and terms.
3. Implement email dispatch with generated PDF/CSV attachments and delivery status tracking.
4. Build receiving screens to log receipts by line item and quantity.
5. Add tolerance checks comparing received quantities vs. ordered amounts; flag mismatches and allow variances within thresholds.
6. Surface alerts for over-receipts or missing items and enable comments/attachments for discrepancies.

## 4. Testing
1. Add workflow transition tests covering valid/invalid state changes and audit logging.
2. Add SLA breach tests that simulate elapsed time and verify overdue flags and notifications.
3. Validate supplier data rules: pricing tier overlaps, missing lead times, preferred constraints, and attachment presence.
4. Cover PO/receiving scenarios: correct exports, email generation hooks, tolerance enforcement, and mismatch alerts on receipts.

## Implementation tips
- Centralize status definitions and transition logic in a workflow service/module to simplify testing.
- Use database transactions around transitions and PO generation to keep data consistent.
- Store audit logs in an append-only table with immutable entries.
- For SLA timers, schedule periodic jobs that mark overdue items and emit events/notifications.
- For attachments, reuse existing file storage utilities and validate MIME types/sizes.
- Keep PDF/CSV rendering isolated in services so they can be reused by both UI and email flows.
