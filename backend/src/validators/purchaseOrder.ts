/*
 * SPDX-License-Identifier: MIT
 */

export type PurchaseOrderStatus =
  | 'draft'
  | 'pending'
  | 'approved'
  | 'sent'
  | 'partially_received'
  | 'received'
  | 'closed'
  | 'cancelled';

export type PurchaseOrderLineStatus = 'open' | 'partial' | 'received';

export const PURCHASE_ORDER_STATUSES: PurchaseOrderStatus[] = [
  'draft',
  'pending',
  'approved',
  'sent',
  'partially_received',
  'received',
  'closed',
  'cancelled',
];

export const PURCHASE_ORDER_LINE_STATUSES: PurchaseOrderLineStatus[] = ['open', 'partial', 'received'];

const STATUS_TRANSITIONS: Record<PurchaseOrderStatus, PurchaseOrderStatus[]> = {
  draft: ['pending', 'approved', 'sent', 'cancelled'],
  pending: ['approved', 'cancelled'],
  approved: ['sent', 'cancelled'],
  sent: ['partially_received', 'received', 'cancelled'],
  partially_received: ['received', 'cancelled'],
  received: ['closed'],
  closed: [],
  cancelled: [],
};

export const deriveLineStatus = (
  ordered: number,
  received: number,
): PurchaseOrderLineStatus => {
  if (received <= 0) return 'open';
  if (received < ordered) return 'partial';
  return 'received';
};

export const assertValidStatusTransition = (
  current: PurchaseOrderStatus,
  next: PurchaseOrderStatus,
): void => {
  if (current === next) return;
  const allowed = STATUS_TRANSITIONS[current] ?? [];
  if (!allowed.includes(next)) {
    throw new Error(`Cannot transition purchase order status from ${current} to ${next}`);
  }
};

export const validateLineQuantities = (
  ordered: number,
  received: number,
  index: number,
): void => {
  if (ordered <= 0) {
    throw new Error(`Line ${index + 1} must have an ordered quantity greater than zero`);
  }
  if (received < 0) {
    throw new Error(`Line ${index + 1} cannot have a negative received quantity`);
  }
  if (received > ordered) {
    throw new Error(`Line ${index + 1} cannot receive more than was ordered`);
  }
};

export const validateMonetaryAmount = (value: number, label: string): void => {
  if (value < 0) {
    throw new Error(`${label} cannot be negative`);
  }
};

export const validateVendorFields = (name?: string, email?: string): void => {
  if (!name?.trim()) {
    throw new Error('Vendor name is required');
  }
  if (email && !/.+@.+\..+/.test(email)) {
    throw new Error('Vendor email must be valid');
  }
};
