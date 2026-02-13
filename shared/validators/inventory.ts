import { z } from 'zod';

export const inventoryPartSchema = z.object({
  name: z.string().min(1),
  sku: z.string().optional(),
  description: z.string().optional(),
  unitCost: z.number().nonnegative().optional(),
  reorderPoint: z.number().int().nonnegative().optional(),
  locationId: z.string().optional(),
  vendorId: z.string().optional(),
});

export const inventoryPartUpdateSchema = inventoryPartSchema.partial();

export const partStockSchema = z.object({
  partId: z.string(),
  siteId: z.string().optional(),
  location: z.string().optional(),
  quantityOnHand: z.number().int().nonnegative().default(0),
});

export type InventoryPartInput = z.infer<typeof inventoryPartSchema>;
export type InventoryPartUpdateInput = z.infer<typeof inventoryPartUpdateSchema>;
export type PartStockInput = z.infer<typeof partStockSchema>;
