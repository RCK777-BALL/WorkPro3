/*
 * SPDX-License-Identifier: MIT
 */

import { z } from 'zod';

const isoDate = z
  .string()
  .transform((value) => new Date(value))
  .refine((value) => !Number.isNaN(value.getTime()), { message: 'Invalid date' });

export const downtimeCreateSchema = z.object({
  assetId: z.string().trim().min(1),
  start: isoDate,
  end: isoDate.optional(),
  reason: z.string().trim().min(1).optional(),
});

export const downtimeUpdateSchema = downtimeCreateSchema.partial().refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field is required',
});

export const downtimeListQuerySchema = z.object({
  assetId: z.string().trim().min(1).optional(),
  start: isoDate.optional(),
  end: isoDate.optional(),
});
