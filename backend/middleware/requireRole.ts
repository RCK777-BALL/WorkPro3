/*
 * SPDX-License-Identifier: MIT
 */

import type { Request, Response, NextFunction } from 'express';
import type { UserRole } from '../models/User';

// Middleware to ensure the authenticated user has one of the required roles
const requireRole =
  (...roles: Array<UserRole>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const userRole: UserRole | undefined = req.user?.role;
    if (roles.length > 0 && (!userRole || !roles.includes(userRole))) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    next();
    return;
  };

export default requireRole;
export { requireRole };
