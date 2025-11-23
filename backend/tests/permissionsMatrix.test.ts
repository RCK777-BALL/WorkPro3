/*
 * SPDX-License-Identifier: MIT
 */

import { describe, expect, it, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

import { hasPermission, requirePermission } from '../src/auth/permissions';

describe('permissions matrix helpers', () => {
  it('honors explicit permissions when roles are missing', () => {
    const allowed = hasPermission(undefined, 'inventory', 'manage', ['inventory:manage']);
    const denied = hasPermission(undefined, 'inventory', 'manage', ['inventory:read']);

    expect(allowed).toBe(true);
    expect(denied).toBe(false);
  });

  it('checks middleware using permissions list', () => {
    const req = {
      user: { permissions: ['audit:read'] },
    } as unknown as Request;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;
    const next = vi.fn() as NextFunction;

    requirePermission('audit', 'read')(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('denies when permissions and roles are insufficient', () => {
    const req = {
      user: { roles: ['viewer'], permissions: ['inventory:read'] },
    } as unknown as Request;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;
    const next = vi.fn() as NextFunction;

    requirePermission('pm', 'write')(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
