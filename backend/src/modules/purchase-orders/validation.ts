/*
 * SPDX-License-Identifier: MIT
 */

import { z } from 'zod';

export const purchaseOrderItemSchema = z.object({
  partId: z.string().min(1),
  quantity: z.number().positive(),
  unitCost: z.number().nonnegative().optional(),
});

export const purchaseOrderInputSchema = z.object({
  vendorId: z.string().min(1).optional(),
  items: z.array(purchaseOrderItemSchema).min(1),
  notes: z.string().max(5000).optional(),
  status: z.enum(['draft', 'sent', 'partially_received', 'received', 'closed', 'canceled']).optional(),
});

export const statusInputSchema = z.object({
  status: z.enum(['draft', 'sent', 'partially_received', 'received', 'closed', 'canceled']),
});

export const receiptInputSchema = z.object({
  partId: z.string().min(1),
  quantity: z.number().positive(),
  note: z.string().max(2000).optional(),
});

export const receivePurchaseOrderSchema = z.object({
  receipts: z.array(receiptInputSchema).min(1),
});
