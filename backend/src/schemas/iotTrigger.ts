/*
 * SPDX-License-Identifier: MIT
 */

import { z } from 'zod';

const objectId = z.string().min(1, 'Identifier is required');

export const iotTriggerConfigSchema = z.object({
  assetId: objectId.optional(),
  metric: z.string().min(1, 'Metric is required'),
  operator: z.enum(['>', '<', '>=', '<=', '==']),
  threshold: z.number().finite(),
  procedureTemplateId: objectId,
  cooldownMinutes: z.number().int().positive().optional(),
  active: z.boolean().optional(),
});

export type IoTTriggerConfigInput = z.infer<typeof iotTriggerConfigSchema>;
