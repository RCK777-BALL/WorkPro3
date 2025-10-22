/*
 * SPDX-License-Identifier: MIT
 */

import type { Request, Response, NextFunction } from 'express';
import type { UserRole } from '../types/auth';

/**
 * Factory for role-based authorization middleware.
 * Ensures the authenticated user has one of the required roles
 * before allowing the request to proceed.
 */
export const authorize = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const userRoles = req.user.roles ?? [];
    if (roles.length > 0 && !roles.some((r) => userRoles.includes(r))) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    next();
  };
};

export default authorize;
