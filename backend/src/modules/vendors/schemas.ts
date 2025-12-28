/*
 * SPDX-License-Identifier: MIT
 */

import { z } from 'zod';

const objectId = z.string().min(1, 'Identifier is required');
const nonNegative = z.number().min(0, 'Value cannot be negative');

export const pricingTierSchema = z.object({
  partId: objectId,
  minQty: nonNegative.optional(),
  maxQty: nonNegative.optional(),
  unitCost: nonNegative,
  currency: z.string().trim().optional(),
  leadTimeDays: nonNegative.optional(),
});

export const vendorInputSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  leadTimeDays: nonNegative.optional(),
  notes: z.string().optional(),
  pricingTiers: z.array(pricingTierSchema).optional(),
});
