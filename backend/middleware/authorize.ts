/*
 * SPDX-License-Identifier: MIT
 */

import type { Request, Response, NextFunction } from 'express';

/**
 * Factory for role-based authorization middleware.
 * Ensures the authenticated user has one of the required roles
 * before allowing the request to proceed.
 */
export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (roles.length > 0 && !roles.includes(req.user.role || '')) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    next();
  };
};

export default authorize;
