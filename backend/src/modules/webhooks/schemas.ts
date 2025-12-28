/*
 * SPDX-License-Identifier: MIT
 */

import { z } from 'zod';

export const webhookSubscriptionSchema = z.object({
  name: z.string().min(1).max(120),
  url: z.string().url(),
  events: z.array(z.string().min(1)).min(1),
  active: z.boolean().optional(),
  maxAttempts: z.number().int().positive().optional(),
});

export const webhookEventSchema = z.object({
  event: z.string().min(1),
  payload: z.unknown().optional(),
});
