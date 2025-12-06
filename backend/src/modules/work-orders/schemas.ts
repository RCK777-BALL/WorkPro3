/*
 * SPDX-License-Identifier: MIT
 */

import { z } from 'zod';

const objectId = z.string().min(1, 'Identifier is required');

export const statusUpdateSchema = z.object({
  status: z.string().min(1),
  note: z.string().optional(),
});

export const approvalAdvanceSchema = z.object({
  note: z.string().optional(),
  approved: z.boolean().default(true),
});

export const slaAcknowledgeSchema = z.object({
  kind: z.enum(['response', 'resolve']),
  at: z.union([z.date(), z.string()]).optional(),
});

export const templateCreateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  defaults: z
    .object({
      priority: z.string().optional(),
      type: z.string().optional(),
      assignedTo: objectId.optional(),
      checklists: z
        .array(
          z.object({
            text: z.string().min(1),
            required: z.boolean().optional(),
          })
        )
        .optional(),
      parts: z
        .array(
          z.object({
            partId: objectId,
            qty: z.number().int().positive().optional(),
          })
        )
        .optional(),
      status: z.string().optional(),
    })
    .optional(),
});

export const templateUpdateSchema = templateCreateSchema.partial();

export const templateParamSchema = z.object({
  templateId: objectId,
});

export const workOrderParamSchema = z.object({
  workOrderId: objectId,
});
