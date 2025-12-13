/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect } from 'vitest';
import { hasPermission } from '../src/auth/permissions';

describe('hasPermission', () => {
  it('allows explicit scoped permissions to bypass role checks', () => {
    const permissions = [
      {
        scope: 'inventory' as const,
        actions: ['read' as const, 'manage' as const],
        tenantId: 'tenant-1',
        siteId: 'site-1',
      },
    ];

    expect(hasPermission([], 'inventory', 'read', permissions, 'tenant-1', 'site-1')).toBe(true);
    expect(hasPermission([], 'inventory', 'manage', permissions, 'tenant-1', 'site-1')).toBe(true);
  });

  it('denies scoped permissions when tenant or site do not match', () => {
    const permissions = [
      {
        scope: 'inventory' as const,
        actions: ['read' as const],
        tenantId: 'tenant-1',
        siteId: 'site-1',
      },
    ];

    expect(hasPermission([], 'inventory', 'read', permissions, 'tenant-2', 'site-1')).toBe(false);
    expect(hasPermission([], 'inventory', 'read', permissions, 'tenant-1', 'site-2')).toBe(false);
  });

  it('falls back to role-based permissions when no scoped grants exist', () => {
    expect(hasPermission(['plant_admin'], 'pm', 'write', undefined, 'tenant-1', 'site-1')).toBe(true);
    expect(hasPermission(['planner'], 'pm', 'delete', undefined, 'tenant-1', 'site-1')).toBe(false);
  });
});
