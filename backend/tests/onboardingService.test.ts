/*
 * SPDX-License-Identifier: MIT
 */

import { describe, expect, it } from 'vitest';

import { STEP_DEFINITIONS } from '../src/modules/onboarding/service';

describe('onboarding step definitions', () => {
  it('routes role setup to the settings roles page', () => {
    const rolesStep = STEP_DEFINITIONS.find((step) => step.key === 'roles');
    expect(rolesStep).toBeDefined();
    expect(rolesStep?.href).toBe('/settings/roles');
  });
});
