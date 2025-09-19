/*
 * SPDX-License-Identifier: MIT
 */

import { z } from 'zod';

export const checklistItemSchema = z.object({
  description: z.string(),
  completed: z.boolean().optional(),
});

export const partLineSchema = z.object({
  partId: z.string(),
  quantity: z.number().int().positive().default(1),
});

export const signatureSchema = z.object({
  userId: z.string(),
  signedAt: z.coerce.date().optional(),
});

export const workOrderStatusSchema = z.enum([
  'requested',
  'assigned',
  'in_progress',
  'completed',
  'cancelled',
]);

export const workOrderCreateSchema = z.object({
  title: z.string(),
  assetId: z.string().optional(),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  status: workOrderStatusSchema.optional(),
  assignees: z.array(z.string()).optional(),
  checklists: z.array(checklistItemSchema).optional(),
  partsUsed: z.array(partLineSchema).optional(),
  signatures: z.array(signatureSchema).optional(),
  timeSpentMin: z.number().int().optional(),
  photos: z.array(z.string()).optional(),
  failureCode: z.string().optional(),
  pmTask: z.string().optional(),
  department: z.string().optional(),
  line: z.string().optional(),
  station: z.string().optional(),
  teamMemberName: z.string().optional(),
  importance: z.enum(['low', 'medium', 'high', 'severe']).optional(),
  dueDate: z.coerce.date().optional(),
  completedAt: z.coerce.date().optional(),
  permits: z.array(z.string()).optional(),
  requiredPermitTypes: z.array(z.string()).optional(),
});

export const workOrderUpdateSchema = workOrderCreateSchema.partial();

export const assignWorkOrderSchema = z.object({
  assignees: z.array(z.string()).optional(),
});

export const startWorkOrderSchema = z.object({});

export const completeWorkOrderSchema = z.object({
  timeSpentMin: z.number().int().optional(),
  checklists: z.array(checklistItemSchema).optional(),
  partsUsed: z.array(partLineSchema).optional(),
  signatures: z.array(signatureSchema).optional(),
});

export const cancelWorkOrderSchema = z.object({});

export type WorkOrderCreate = z.infer<typeof workOrderCreateSchema>;
export type WorkOrderUpdate = z.infer<typeof workOrderUpdateSchema>;
export type WorkOrderAssign = z.infer<typeof assignWorkOrderSchema>;
export type WorkOrderComplete = z.infer<typeof completeWorkOrderSchema>;

