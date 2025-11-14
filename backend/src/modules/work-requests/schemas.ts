/*
 * SPDX-License-Identifier: MIT
 */

import { z } from 'zod';

const optionalString = z
  .union([z.string(), z.undefined(), z.null()])
  .transform((value) => {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  });

export const publicWorkRequestSchema = z.object({
  formSlug: z.string().trim().min(1, 'A request form slug is required.'),
  title: z.string().trim().min(3, 'Please provide a short title for your request.'),
  description: z.string().trim().min(10, 'Please share a few more details about the issue.'),
  requesterName: z.string().trim().min(2, 'Let us know who is submitting this request.'),
  requesterEmail: optionalString,
  requesterPhone: optionalString,
  location: optionalString,
  assetTag: optionalString,
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
});

export const workRequestConversionSchema = z.object({
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  workOrderType: z.enum(['corrective', 'preventive', 'inspection', 'calibration', 'safety']).optional(),
});

export type PublicWorkRequestInput = z.infer<typeof publicWorkRequestSchema>;
export type WorkRequestConversionInput = z.infer<typeof workRequestConversionSchema>;
