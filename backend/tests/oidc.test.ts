/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { oidcVerify, mapRoles } from '../auth/oidc';
import User from '../models/User';

afterEach(() => {
  vi.restoreAllMocks();
});

// Test role mapping
describe('OIDC role mapping', () => {
  it('maps provider groups to internal roles', () => {
    expect(mapRoles(['Admin'])).toBe('general_manager');
    expect(mapRoles(['Manager'])).toBe('assistant_general_manager');
    expect(mapRoles(['Technician'])).toBe('technical_team_member');
    expect(mapRoles([])).toBe('planner');
  });
});

// Test verify callback
describe('OIDC verify callback', () => {
  it('creates user object with mapped role', async () => {
    const profile = { emails: [{ value: 'user@example.com' }], _json: { groups: ['Admin'] } };
    const done = vi.fn();
    vi.spyOn(User, 'findOne').mockReturnValue({
      select: vi.fn().mockResolvedValue(null),
    } as never);
    await oidcVerify('issuer', 'sub', profile, {}, '', '', {}, done);
    expect(done).toHaveBeenCalledWith(null, {
      email: 'user@example.com',
      roles: ['general_manager'],
      tenantId: undefined,
      siteId: undefined,
      id: undefined,
    });
  });
});
