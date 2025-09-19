/*
 * SPDX-License-Identifier: MIT
 */

import { z } from 'zod';

export const permitApprovalStepSchema = z.object({
  sequence: z.number().int().min(0).optional(),
  role: z.string().min(1),
  user: z.string().optional(),
  escalateAfterHours: z.number().int().positive().optional(),
  notes: z.string().optional(),
});

export const permitIsolationStepSchema = z.object({
  description: z.string().min(1),
  verificationNotes: z.string().optional(),
  completed: z.boolean().optional(),
  completedBy: z.string().optional(),
  completedAt: z.coerce.date().optional(),
});

export const permitCreateSchema = z.object({
  permitNumber: z.string().optional(),
  type: z.string().min(1),
  description: z.string().optional(),
  requestedBy: z.string(),
  workOrder: z.string().optional(),
  approvalChain: z.array(permitApprovalStepSchema).min(1),
  isolationSteps: z.array(permitIsolationStepSchema).optional(),
  watchers: z.array(z.string()).optional(),
  validFrom: z.coerce.date().optional(),
  validTo: z.coerce.date().optional(),
  riskLevel: z.enum(['low', 'medium', 'high', 'critical']).optional(),
});

export const permitUpdateSchema = permitCreateSchema.partial();

export const permitDecisionSchema = z.object({
  notes: z.string().optional(),
});

export const permitIsolationSchema = z.object({
  verificationNotes: z.string().optional(),
});

export const permitIncidentSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  severity: z.enum(['minor', 'moderate', 'major', 'critical']).default('minor'),
  status: z.enum(['open', 'investigating', 'resolved', 'closed']).optional(),
  actions: z
    .array(
      z.object({
        description: z.string().min(1),
        assignedTo: z.string().optional(),
        dueDate: z.coerce.date().optional(),
      }),
    )
    .optional(),
  message: z.string().optional(),
});
