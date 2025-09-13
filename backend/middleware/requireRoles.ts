/*
 * SPDX-License-Identifier: MIT
 */

import type { Request, Response, NextFunction } from 'express';
import type { UserRole } from '../models/User';

// Middleware to ensure the authenticated user has one of the required roles
const requireRoles =
  (roles: UserRole[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const userRoles: UserRole[] = req.user.roles ?? [];
    if (roles.length > 0 && !roles.some((role) => userRoles.includes(role))) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    next();
  };

export default requireRoles;
export { requireRoles };
