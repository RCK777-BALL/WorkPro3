import { z } from 'zod';

export const purchaseOrderLineSchema = z.object({
  partId: z.string(),
  description: z.string().optional(),
  quantity: z.number().int().positive(),
  unitCost: z.number().nonnegative(),
  tax: z.number().nonnegative().optional(),
  fees: z.number().nonnegative().optional(),
});

export const purchaseOrderSchema = z.object({
  vendorId: z.string(),
  status: z.enum(['draft', 'sent', 'partially_received', 'closed', 'canceled']).default('draft'),
  lines: z.array(purchaseOrderLineSchema).min(1),
  notes: z.string().optional(),
  expectedDate: z.string().optional(),
});

export const purchaseOrderUpdateSchema = purchaseOrderSchema.partial();

export type PurchaseOrderInput = z.infer<typeof purchaseOrderSchema>;
export type PurchaseOrderUpdateInput = z.infer<typeof purchaseOrderUpdateSchema>;
