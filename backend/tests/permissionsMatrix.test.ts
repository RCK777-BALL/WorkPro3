/*
 * SPDX-License-Identifier: MIT
 */

import { describe, expect, it, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

import { requirePermission } from '../src/auth/permissions';

describe('permissions matrix helpers', () => {
  it('checks middleware using permissions list', async () => {
    const req = {
      user: { permissions: ['audit.read'], id: 'user-1', tenantId: 'tenant-1' },
      tenantId: 'tenant-1',
    } as unknown as Request;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;
    const next = vi.fn() as NextFunction;

    await requirePermission('audit', 'read')(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('denies when permissions and roles are insufficient', async () => {
    const req = {
      user: { roles: ['viewer'], permissions: ['inventory.read'], id: 'user-1', tenantId: 'tenant-1' },
      tenantId: 'tenant-1',
    } as unknown as Request;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;
    const next = vi.fn() as NextFunction;

    await requirePermission('pm', 'write')(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
