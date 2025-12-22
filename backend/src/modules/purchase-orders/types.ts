/*
 * SPDX-License-Identifier: MIT
 */

import { z } from 'zod';

import { purchaseOrderInputSchema, receiptInputSchema } from './validation';
import type { PurchaseOrderAuditEntry, PurchaseOrderStatus } from './model';

export type PurchaseOrderInput = z.infer<typeof purchaseOrderInputSchema>;
export type ReceiptInput = z.infer<typeof receiptInputSchema>;

export interface PurchaseOrderItemResponse {
  partId: string;
  quantity: number;
  unitCost?: number | undefined;
  received: number;
  status: 'open' | 'partial' | 'received' | 'backordered';
}

export interface PurchaseOrder {
  id: string;
  vendorId: string;
  notes?: string;
  status: PurchaseOrderStatus;
  items: PurchaseOrderItemResponse[];
  totalCost: number;
  subtotal: number;
  receivedTotal: number;
  auditTrail: PurchaseOrderAuditEntry[];
  createdAt: string;
  updatedAt?: string | undefined;
}
