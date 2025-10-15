/*
 * SPDX-License-Identifier: MIT
 */


import type { Request, Response, NextFunction } from 'express';
import type { UserRole } from '../types/auth';
import { requireAuth as baseRequireAuth } from './requireAuth';

export const requireAuth = baseRequireAuth;

export const requireRole = (...allowed: UserRole[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const roles = (req as any).user?.roles as UserRole[] | undefined;
    if (!roles || !allowed.some((r) => roles.includes(r))) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }
    next();
  };

export default {
  requireAuth: baseRequireAuth,
  requireRole,
};
