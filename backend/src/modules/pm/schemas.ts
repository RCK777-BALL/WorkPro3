/*
 * SPDX-License-Identifier: MIT
 */

import { z } from 'zod';

const objectId = z.string().min(1, 'Identifier is required');

const checklistItem = z.object({
  id: z.string().optional(),
  description: z.string().min(1, 'Checklist description is required'),
  required: z.boolean().optional(),
});

const requiredPartItem = z.object({
  id: z.string().optional(),
  partId: objectId,
  quantity: z.number().int().positive().optional(),
});

const triggerSchema = z.object({
  type: z.enum(['time', 'meter']).default('time'),
  meterThreshold: z.number().positive().optional(),
});

export const assignmentInputSchema = z
  .object({
    assetId: objectId,
    interval: z.string().min(1, 'Interval is required').optional(),
    usageMetric: z.enum(['runHours', 'cycles']).optional(),
    usageTarget: z.number().positive().optional(),
    usageLookbackDays: z.number().int().positive().max(365).optional(),
    checklist: z.array(checklistItem).optional(),
    requiredParts: z.array(requiredPartItem).optional(),
    trigger: triggerSchema.optional(),
  })
  .superRefine((data, ctx) => {
    const triggerType = data.trigger?.type ?? 'time';
    if (triggerType === 'time' && !data.interval) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Interval is required for time-based triggers' });
    }
    if (triggerType === 'meter' && !data.trigger?.meterThreshold) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Meter threshold is required for meter triggers' });
    }
  });

export type AssignmentInput = z.infer<typeof assignmentInputSchema>;

export const templateInputSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  category: z.string().min(1, 'Category is required'),
  description: z.string().optional(),
  tasks: z.array(z.string()).optional(),
  estimatedMinutes: z.number().int().nonnegative().optional(),
});
