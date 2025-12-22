/*
 * SPDX-License-Identifier: MIT
 */

import { z } from 'zod';

const objectId = z.string().min(1, 'Identifier is required');

export const categoryInputSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
});

export const procedureTemplateInputSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  category: objectId.optional(),
});

const requiredPartSchema = z.object({
  partId: objectId,
  quantity: z.number().int().positive().optional(),
});

const requiredToolSchema = z.object({
  toolName: z.string().min(1, 'Tool name is required'),
  quantity: z.number().int().positive().optional(),
});

export const procedureVersionInputSchema = z.object({
  durationMinutes: z.number().int().positive({ message: 'Duration must be at least 1 minute' }),
  safetySteps: z.array(z.string().trim()).min(1, 'At least one safety step is required'),
  steps: z.array(z.string().trim()).optional(),
  notes: z.string().optional(),
  requiredParts: z.array(requiredPartSchema).optional(),
  requiredTools: z.array(requiredToolSchema).optional(),
});

export type ProcedureTemplateInput = z.infer<typeof procedureTemplateInputSchema>;
export type ProcedureVersionInput = z.infer<typeof procedureVersionInputSchema>;
export type CategoryInput = z.infer<typeof categoryInputSchema>;
