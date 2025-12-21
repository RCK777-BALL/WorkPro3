/*
 * SPDX-License-Identifier: MIT
 */

import { describe, expect, it } from 'vitest';

import { publicWorkRequestSchema, workRequestConversionSchema } from '../src/modules/work-requests/schemas';

const validInput = {
  formSlug: 'safety',
  title: 'Loose guard rail',
  description: 'The guard rail near the stairwell is wobbling and needs repair.',
  requesterName: 'Sam User',
  requesterEmail: 'sam@example.com',
  requesterPhone: '555-0100',
  location: 'Stairwell B',
  assetTag: 'RAIL-9',
  priority: 'high' as const,
};

describe('work request validation', () => {
  it('accepts well-formed public submissions and trims optional fields', () => {
    const parsed = publicWorkRequestSchema.parse({ ...validInput, requesterEmail: '  sam@example.com  ' });
    expect(parsed.formSlug).toBe('safety');
    expect(parsed.requesterEmail).toBe('sam@example.com');
  });

  it('rejects missing or invalid public submission fields', () => {
    const result = publicWorkRequestSchema.safeParse({
      formSlug: '',
      title: 'ok',
      description: 'short',
      requesterName: '',
      priority: 'unknown',
    });

    expect(result.success).toBe(false);
    const message = result.success ? '' : result.error.errors.map((issue) => issue.message).join(' ');
    expect(message).toContain('A request form slug is required');
    expect(message).toContain('Please provide a short title');
    expect(message).toContain('Please share a few more details');
    expect(message).toContain('Let us know who is submitting');
  });

  it('validates conversion options', () => {
    const validConversion = workRequestConversionSchema.parse({ priority: 'low', workOrderType: 'corrective' });
    expect(validConversion.priority).toBe('low');

    const invalidConversion = workRequestConversionSchema.safeParse({ priority: 'invalid' });
    expect(invalidConversion.success).toBe(false);
  });
});
