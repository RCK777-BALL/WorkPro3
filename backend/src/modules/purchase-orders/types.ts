/*
 * SPDX-License-Identifier: MIT
 */

import { z } from 'zod';

import { purchaseOrderInputSchema, receiptInputSchema } from './validation';
import type { PurchaseOrderStatus } from './model';

export type PurchaseOrderInput = z.infer<typeof purchaseOrderInputSchema>;
export type ReceiptInput = z.infer<typeof receiptInputSchema>;

export interface PurchaseOrderItemResponse {
  partId: string;
  quantity: number;
  unitCost?: number | undefined;
  received: number;
  status: 'open' | 'partial' | 'received';
}

export interface PurchaseOrder {
  id: string;
  vendorId: string;
  status: PurchaseOrderStatus;
  items: PurchaseOrderItemResponse[];
  totalCost: number;
  createdAt: string;
  updatedAt?: string | undefined;
}
