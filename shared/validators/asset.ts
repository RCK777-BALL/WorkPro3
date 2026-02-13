import { z } from 'zod';

export const assetBaseSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['Electrical', 'Mechanical', 'Tooling', 'Interface', 'Welding']).optional(),
  qrCode: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
  departmentId: z.string().optional(),
  lineId: z.string().optional(),
  stationId: z.string().optional(),
  status: z.enum(['Active', 'Offline', 'In Repair']).optional(),
  serialNumber: z.string().optional(),
  description: z.string().optional(),
  modelName: z.string().optional(),
  manufacturer: z.string().optional(),
  purchaseDate: z.string().optional(),
  warrantyStart: z.string().optional(),
  warrantyEnd: z.string().optional(),
  purchaseCost: z.number().nonnegative().optional(),
  expectedLifeMonths: z.number().int().positive().optional(),
  replacementDate: z.string().optional(),
  installationDate: z.string().optional(),
  criticality: z.enum(['high', 'medium', 'low']).optional(),
  documents: z.array(z.string()).optional(),
  customFields: z.record(z.unknown()).optional(),
});

export const assetCreateSchema = assetBaseSchema.extend({
  name: z.string().min(1),
});

export const assetUpdateSchema = assetBaseSchema.partial();

export const assetQuerySchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  type: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(25),
});

export type AssetCreateInput = z.infer<typeof assetCreateSchema>;
export type AssetUpdateInput = z.infer<typeof assetUpdateSchema>;
export type AssetQueryInput = z.infer<typeof assetQuerySchema>;
