import { z } from 'zod';

export const workOrderStatusSchema = z.enum([
  'draft',
  'open',
  'in_progress',
  'on_hold',
  'completed',
  'canceled',
]);

export const workOrderPrioritySchema = z.enum(['low', 'medium', 'high', 'critical']);

export const workOrderBaseSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  assetId: z.string().optional(),
  priority: workOrderPrioritySchema.default('medium'),
  status: workOrderStatusSchema.default('open'),
  type: z.enum(['corrective', 'preventive', 'inspection', 'calibration', 'safety']).default('corrective'),
  checklists: z
    .array(
      z.object({
        text: z.string().min(1),
        done: z.boolean().default(false),
      }),
    )
    .optional(),
  laborTimeMin: z.number().int().nonnegative().optional(),
  partsUsed: z
    .array(
      z.object({
        partId: z.string(),
        quantity: z.number().int().positive(),
      }),
    )
    .optional(),
  attachments: z.array(z.string()).optional(),
  dueDate: z.string().optional(),
});

export const workOrderCreateSchema = workOrderBaseSchema;
export const workOrderUpdateSchema = workOrderBaseSchema.partial();

export const workOrderQuerySchema = z.object({
  status: workOrderStatusSchema.optional(),
  priority: workOrderPrioritySchema.optional(),
  assetId: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(25),
});

export type WorkOrderCreateInput = z.infer<typeof workOrderCreateSchema>;
export type WorkOrderUpdateInput = z.infer<typeof workOrderUpdateSchema>;
export type WorkOrderQueryInput = z.infer<typeof workOrderQuerySchema>;
