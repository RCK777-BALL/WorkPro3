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

export const assignmentInputSchema = z.object({
  assetId: objectId,
  interval: z.string().min(1, 'Interval is required'),
  checklist: z.array(checklistItem).optional(),
  requiredParts: z.array(requiredPartItem).optional(),
});

export type AssignmentInput = z.infer<typeof assignmentInputSchema>;
