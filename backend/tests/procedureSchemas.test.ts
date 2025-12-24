import { describe, expect, it } from 'vitest';

import { procedureTemplateInputSchema, procedureVersionInputSchema } from '../src/modules/pm/procedureSchemas';

describe('procedure schemas', () => {
  it('validates procedure template input', () => {
    const result = procedureTemplateInputSchema.safeParse({
      name: 'Monthly lubrication',
      description: 'Check oil levels',
    });
    expect(result.success).toBe(true);
  });

  it('rejects procedure versions missing required fields', () => {
    const result = procedureVersionInputSchema.safeParse({
      durationMinutes: 0,
      safetySteps: [],
    });
    expect(result.success).toBe(false);
  });
});
