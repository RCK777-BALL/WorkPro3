/*
 * SPDX-License-Identifier: MIT
 */

import { z } from 'zod';

import type { NotificationProvider } from './service';
import { ALL_PERMISSIONS, type Permission } from '../../../shared/permissions';

const providers: [NotificationProvider, NotificationProvider, NotificationProvider, NotificationProvider, NotificationProvider] = [
  'twilio',
  'smtp',
  'outlook',
  'slack',
  'teams',
];

export const accountingProviderSchema = z.enum(['quickbooks', 'xero']);

export const accountingSyncSchema = z.object({
  provider: accountingProviderSchema,
  payload: z.record(z.unknown()).optional(),
});

export const notificationTestSchema = z
  .object({
    provider: z.enum(providers),
    to: z.string().min(3).max(320).optional(),
    subject: z.string().min(1).max(140).optional(),
    message: z.string().min(1).max(2000),
    webhookUrl: z.string().url().optional(),
  })
  .superRefine((value, ctx) => {
    if ((value.provider === 'twilio' || value.provider === 'smtp' || value.provider === 'outlook') && !value.to) {
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

const permissionScopes = (() => {
  const scopes = new Set<string>(ALL_PERMISSIONS);
  ALL_PERMISSIONS.forEach((permission) => {
    const [scope] = permission.split('.', 1);
    if (scope) {
      scopes.add(`${scope}.*`);
    }
  });
  scopes.add('*');
  return scopes;
})();

const normalizedScope = z
  .string()
  .min(1)
  .transform((value) => value.trim().toLowerCase())
  .refine((value) => permissionScopes.has(value), {
    message: 'Invalid permission scope',
  });

export const apiKeySchema = z.object({
  name: z.string().min(1).max(120),
  rateLimitMax: z.number().int().positive().optional(),
  scopes: z.array(normalizedScope).default([]).transform((scopes) => scopes as Permission[]),
});

export type ApiKeyPayload = z.infer<typeof apiKeySchema> & { scopes: Permission[] };

export const apiKeyScopes = Array.from(permissionScopes).sort();
