/*
 * SPDX-License-Identifier: MIT
 */

import { z } from 'zod';

import type { NotificationProvider } from './service';

const providers: [NotificationProvider, NotificationProvider, NotificationProvider, NotificationProvider] = [
  'twilio',
  'smtp',
  'slack',
  'teams',
];

export const notificationTestSchema = z
  .object({
    provider: z.enum(providers),
    to: z.string().min(3).max(320).optional(),
    subject: z.string().min(1).max(140).optional(),
    message: z.string().min(1).max(2000),
    webhookUrl: z.string().url().optional(),
  })
  .superRefine((value, ctx) => {
    if ((value.provider === 'twilio' || value.provider === 'smtp') && !value.to) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['to'],
        message: 'Destination is required for this provider',
      });
    }
    if ((value.provider === 'slack' || value.provider === 'teams') && value.to) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['to'],
        message: 'Webhook-based providers do not support direct recipients',
      });
    }
  });

export type NotificationTestPayload = z.infer<typeof notificationTestSchema>;
