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
  tags: z
    .array(z.string().trim())
    .max(10, 'Use at most 10 tags')
    .optional(),
});

export const workRequestConversionSchema = z.object({
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  workOrderType: z.enum(['corrective', 'preventive', 'inspection', 'calibration', 'safety']).optional(),
});

export const workRequestDecisionSchema = z.object({
  status: z.enum(['accepted', 'rejected']),
  note: z.string().trim().max(2000).optional(),
  reason: z.string().trim().max(200).optional(),
});

export const listWorkRequestQuerySchema = z.object({
  status: z.string().trim().optional(),
  priority: z.string().trim().optional(),
  search: z.string().trim().optional(),
  requestType: z.string().trim().optional(),
  siteId: z.string().trim().optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(200).optional(),
  includeDeleted: z.coerce.boolean().optional(),
});

export type PublicWorkRequestInput = z.infer<typeof publicWorkRequestSchema>;
export type WorkRequestConversionInput = z.infer<typeof workRequestConversionSchema>;
export type WorkRequestDecisionInput = z.infer<typeof workRequestDecisionSchema>;
export type ListWorkRequestQuery = z.infer<typeof listWorkRequestQuerySchema>;
