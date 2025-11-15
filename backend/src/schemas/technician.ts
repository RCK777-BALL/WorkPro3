/*
 * SPDX-License-Identifier: MIT
 */

import { z } from 'zod';

const objectId = z.string().min(1, 'Identifier is required');

const partUsageEntry = z.object({
  partId: objectId,
  qty: z.number().int().positive(),
  cost: z.number().nonnegative().optional(),
});

export const technicianStateSchema = z.object({
  action: z.enum(['start', 'pause', 'resume', 'complete', 'log_time']),
  minutesWorked: z.number().int().nonnegative().optional(),
  offlineId: z.string().optional(),
});

export const technicianPartUsageSchema = z.object({
  entries: z.array(partUsageEntry).min(1),
});

export type TechnicianStateInput = z.infer<typeof technicianStateSchema>;
export type TechnicianPartUsageInput = z.infer<typeof technicianPartUsageSchema>;
