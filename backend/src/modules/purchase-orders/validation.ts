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
  vendorId: z.string().min(1),
  items: z.array(purchaseOrderItemSchema).min(1),
  status: z.enum(['draft', 'pending', 'approved', 'received']).optional(),
});

export const statusInputSchema = z.object({
  status: z.enum(['draft', 'pending', 'approved', 'received']),
});

export const receiptInputSchema = z.object({
  partId: z.string().min(1),
  quantity: z.number().positive(),
});

export const receivePurchaseOrderSchema = z.object({
  receipts: z.array(receiptInputSchema).min(1),
});
