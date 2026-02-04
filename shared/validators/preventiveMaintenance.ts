import { z } from 'zod';

export const pmScheduleSchema = z.object({
  cadenceType: z.enum(['time', 'meter']),
  cadenceValue: z.number().positive(),
  meterUnit: z.string().optional(),
  startDate: z.string().optional(),
});

export const preventiveMaintenanceSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  assetIds: z.array(z.string()).min(1),
  checklistTemplateId: z.string().optional(),
  schedule: pmScheduleSchema,
  nextRunAt: z.string().optional(),
  active: z.boolean().default(true),
});

export const preventiveMaintenanceUpdateSchema = preventiveMaintenanceSchema.partial();

export type PreventiveMaintenanceInput = z.infer<typeof preventiveMaintenanceSchema>;
export type PreventiveMaintenanceUpdateInput = z.infer<typeof preventiveMaintenanceUpdateSchema>;
