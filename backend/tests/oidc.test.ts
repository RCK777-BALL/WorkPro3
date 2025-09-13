/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi } from 'vitest';
import { oidcVerify, mapRoles } from '../auth/oidc';

// Test role mapping
describe('OIDC role mapping', () => {
  it('maps provider groups to internal roles', () => {
    expect(mapRoles(['Admin'])).toBe('admin');
    expect(mapRoles(['Manager'])).toBe('supervisor');
    expect(mapRoles(['Technician'])).toBe('tech');
    expect(mapRoles([])).toBe('planner');
  });
});

// Test verify callback
describe('OIDC verify callback', () => {
  it('creates user object with mapped role', async () => {
    const profile = { emails: [{ value: 'user@example.com' }], _json: { groups: ['Admin'] } };
    const done = vi.fn();
    await oidcVerify('issuer', 'sub', profile, {}, '', '', {}, done);
    expect(done).toHaveBeenCalledWith(null, { email: 'user@example.com', roles: ['admin'] });
  });
});
