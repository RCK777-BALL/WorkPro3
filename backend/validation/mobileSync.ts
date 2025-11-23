/*
 * SPDX-License-Identifier: MIT
 */

import { z } from 'zod';

export const mobileSyncPullSchema = z.object({
  lastSync: z
    .object({
      workOrders: z.string().optional(),
      pms: z.string().optional(),
      assets: z.string().optional(),
    })
    .default({}),
});

export const mobileSyncActionSchema = z.object({
  entityType: z.string(),
  entityId: z.string().optional(),
  operation: z.string(),
  payload: z.record(z.any()).optional(),
  version: z.number().optional(),
});

export const mobileSyncPushSchema = z.object({
  actions: z.array(mobileSyncActionSchema),
});

export type MobileSyncPullInput = z.infer<typeof mobileSyncPullSchema>;
export type MobileSyncPushInput = z.infer<typeof mobileSyncPushSchema>;
