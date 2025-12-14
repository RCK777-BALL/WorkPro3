/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect } from 'vitest';
import { hasPermission } from '../services/permissionService';

describe('hasPermission', () => {
  it('matches explicit permissions', () => {
    expect(hasPermission(['inventory.manage'], 'inventory.manage')).toBe(true);
    expect(hasPermission(['inventory.manage'], 'inventory.read')).toBe(false);
  });

  it('honors wildcards', () => {
    expect(hasPermission(['inventory.*'], 'inventory.manage')).toBe(true);
    expect(hasPermission(['*'], 'reports.export')).toBe(true);
  });
});
