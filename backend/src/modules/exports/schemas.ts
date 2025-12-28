/*
 * SPDX-License-Identifier: MIT
 */

import { z } from 'zod';

export const exportJobSchema = z.object({
  type: z.string().min(1),
  format: z.enum(['csv', 'xlsx']).default('csv'),
  filters: z.record(z.unknown()).optional(),
});
