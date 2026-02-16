/*
 * SPDX-License-Identifier: MIT
 */

import { z } from 'zod';

export const notificationChannelSchema = z.enum(['email', 'outlook', 'push', 'in_app', 'webhook', 'teams']);

export const quietHoursSchema = z
  .object({
    start: z.string().optional(),
    end: z.string().optional(),
  })
  .optional();

export const digestSchema = z
  .object({
    enabled: z.boolean().optional(),
    frequency: z.enum(['hourly', 'daily', 'weekly']).optional(),
  })
  .optional();

export const subscriptionInputSchema = z.object({
  events: z.array(z.string()).default([]),
  channels: z.array(notificationChannelSchema).min(1),
  quietHours: quietHoursSchema,
  digest: digestSchema,
});

export type NotificationChannelInput = z.infer<typeof notificationChannelSchema>;
export type NotificationSubscriptionInput = z.infer<typeof subscriptionInputSchema>;
