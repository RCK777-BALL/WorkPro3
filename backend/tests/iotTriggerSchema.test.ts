import { describe, expect, it } from 'vitest';

import { iotTriggerConfigSchema } from '../src/schemas/iotTrigger';

describe('iotTriggerConfigSchema', () => {
  it('accepts a valid trigger payload', () => {
    const result = iotTriggerConfigSchema.safeParse({
      metric: 'temperature',
      operator: '>',
      threshold: 85,
      procedureTemplateId: '507f1f77bcf86cd799439011',
      cooldownMinutes: 10,
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing required fields', () => {
    const result = iotTriggerConfigSchema.safeParse({
      metric: '',
      operator: '>',
      threshold: 85,
    });
    expect(result.success).toBe(false);
  });
});
