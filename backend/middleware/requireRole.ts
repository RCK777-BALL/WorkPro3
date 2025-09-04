import { Request, Response, NextFunction } from 'express';

// Middleware to ensure the authenticated user has one of the required roles
const requireRole =
  (...roles: Array<'admin' | 'manager' | 'technician' | 'viewer'>) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const userRole = req.user.role;
    if (roles.length > 0 && (!userRole || !roles.includes(userRole))) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    return next();
  };

export default requireRole;
export { requireRole };
